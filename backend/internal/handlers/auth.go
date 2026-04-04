package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"gorm.io/gorm"

	"triequest-backend/internal/models"
	"triequest-backend/internal/security"
	"triequest-backend/internal/services"
)

func (h *Handler) CheckUsername(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if len(username) < 3 || len(username) > 24 {
		writeError(w, http.StatusUnprocessableEntity, "Username must be between 3 and 24 characters.")
		return
	}

	if !services.IsUsernameMaybeTaken(username) {
		writeJSON(w, http.StatusOK, map[string]bool{"available": true})
		return
	}

	var user models.User
	err := h.DB.Where("LOWER(username) = ?", strings.ToLower(username)).First(&user).Error
	writeJSON(w, http.StatusOK, map[string]bool{"available": err == gorm.ErrRecordNotFound})
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email            string  `json:"email"`
		Username         string  `json:"username"`
		DisplayName      string  `json:"displayName"`
		Password         string  `json:"password"`
		FavoriteTopic    *string `json:"favoriteTopic"`
		FavoritePlatform *string `json:"favoritePlatform"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "Invalid request body.")
		return
	}

	username, err := validateUsername(req.Username)
	if err != nil {
		writeValidationError(w, "username", err.Error())
		return
	}

	displayName, err := validateRequiredText(req.DisplayName, "Display name")
	if err != nil {
		writeValidationError(w, "displayName", err.Error())
		return
	}

	if err := validatePassword(req.Password); err != nil {
		writeValidationError(w, "password", err.Error())
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || !strings.Contains(email, "@") {
		writeValidationError(w, "email", "A valid email address is required.")
		return
	}

	var existing models.User
	if err := h.DB.Where("LOWER(email) = ?", email).First(&existing).Error; err == nil {
		writeError(w, http.StatusConflict, "An account already exists for that email.")
		return
	}
	if err := h.DB.Where("username = ?", username).First(&existing).Error; err == nil {
		writeError(w, http.StatusConflict, "That username is already taken.")
		return
	}

	passwordHash, err := security.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to process registration.")
		return
	}

	avatarURL := fmt.Sprintf("https://api.dicebear.com/9.x/initials/svg?seed=%s", username)
	user := models.User{
		Email: email, Username: username, DisplayName: displayName,
		Bio: "", FavoriteTopic: req.FavoriteTopic, FavoritePlatform: req.FavoritePlatform,
		AvatarURL: &avatarURL, PasswordHash: &passwordHash, AuthProvider: "local",
	}

	tx := h.DB.Begin()
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		writeError(w, http.StatusConflict, "An account with those credentials already exists.")
		return
	}

	group := models.Group{Name: fmt.Sprintf("%s's Squad", user.DisplayName), OwnerID: user.ID}
	tx.Create(&group)
	tx.Create(&models.GroupMembership{GroupID: group.ID, UserID: user.ID, Role: "owner"})

	if err := tx.Commit().Error; err != nil {
		writeError(w, http.StatusConflict, "An account with those credentials already exists.")
		return
	}

	services.AddUsernameToBloom(user.Username)
	services.AddUsernameToTrie(user.Username)

	h.writeTokenResponse(w, http.StatusCreated, &user)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Identifier string `json:"identifier"`
		Email      string `json:"email"`
		Password   string `json:"password"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "Invalid request body.")
		return
	}

	identifier := req.Identifier
	if identifier == "" {
		identifier = req.Email
	}
	identifier = strings.TrimSpace(identifier)
	if identifier == "" {
		writeError(w, http.StatusUnprocessableEntity, "Email or username is required.")
		return
	}

	rateLimitKey := fmt.Sprintf("%s:%s", clientIP(r), strings.ToLower(identifier))
	decision := h.AuthRL.Check(rateLimitKey)
	if !decision.Allowed {
		writeErrorWithHeader(w, http.StatusTooManyRequests,
			"Too many login attempts. Please wait and try again.",
			map[string]string{"Retry-After": fmt.Sprintf("%d", decision.RetryAfterSeconds)})
		return
	}

	normalized := strings.ToLower(strings.TrimSpace(identifier))
	var user models.User
	err := h.DB.Where("LOWER(email) = ? OR LOWER(username) = ?", normalized, normalized).First(&user).Error
	if err != nil || user.PasswordHash == nil || *user.PasswordHash == "" {
		h.AuthRL.RecordFailure(rateLimitKey)
		writeError(w, http.StatusUnauthorized, "Invalid email, username, or password.")
		return
	}

	match, err := security.VerifyPassword(req.Password, *user.PasswordHash)
	if err != nil || !match {
		h.AuthRL.RecordFailure(rateLimitKey)
		writeError(w, http.StatusUnauthorized, "Invalid email, username, or password.")
		return
	}

	h.AuthRL.Clear(rateLimitKey)
	h.writeTokenResponse(w, http.StatusOK, &user)
}

func (h *Handler) GoogleAuth(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code string `json:"code"`
	}
	if err := decodeJSON(r, &req); err != nil || req.Code == "" {
		writeError(w, http.StatusUnprocessableEntity, "Invalid request body.")
		return
	}

	googleUser, err := services.ExchangeCodeForUser(req.Code, h.Config)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Google authentication failed. Please try again.")
		return
	}

	if !googleUser.EmailVerified {
		writeError(w, http.StatusUnauthorized, "Google account email must be verified before sign-in.")
		return
	}

	// Check for existing user by google_id
	var user models.User
	if err := h.DB.Where("google_id = ?", googleUser.GoogleID).First(&user).Error; err == nil {
		if user.AvatarURL != nil && strings.Contains(*user.AvatarURL, "dicebear") && googleUser.Picture != nil {
			user.AvatarURL = googleUser.Picture
			h.DB.Save(&user)
		}
		h.writeTokenResponse(w, http.StatusOK, &user)
		return
	}

	// Check for existing user by email
	if err := h.DB.Where("LOWER(email) = ?", strings.ToLower(googleUser.Email)).First(&user).Error; err == nil {
		user.GoogleID = &googleUser.GoogleID
		provider := "google"
		if user.PasswordHash != nil {
			provider = "both"
		}
		user.AuthProvider = provider
		if user.AvatarURL != nil && strings.Contains(*user.AvatarURL, "dicebear") && googleUser.Picture != nil {
			user.AvatarURL = googleUser.Picture
		}
		h.DB.Save(&user)
		h.writeTokenResponse(w, http.StatusOK, &user)
		return
	}

	// Create new user
	baseUsername := strings.ToLower(strings.Split(googleUser.Email, "@")[0])
	if len(baseUsername) > 24 {
		baseUsername = baseUsername[:24]
	}
	username := baseUsername
	counter := 1
	for {
		var existing models.User
		if h.DB.Where("username = ?", username).First(&existing).Error == gorm.ErrRecordNotFound {
			break
		}
		suffix := fmt.Sprintf("%d", counter)
		maxLen := 24 - len(suffix)
		if maxLen > len(baseUsername) {
			maxLen = len(baseUsername)
		}
		username = baseUsername[:maxLen] + suffix
		counter++
	}

	avatarURL := fmt.Sprintf("https://api.dicebear.com/9.x/initials/svg?seed=%s", username)
	if googleUser.Picture != nil {
		avatarURL = *googleUser.Picture
	}
	user = models.User{
		Email: strings.ToLower(googleUser.Email), Username: username,
		DisplayName: googleUser.Name, Bio: "",
		AvatarURL: &avatarURL, GoogleID: &googleUser.GoogleID,
		AuthProvider: "google",
	}

	tx := h.DB.Begin()
	tx.Create(&user)
	group := models.Group{Name: fmt.Sprintf("%s's Squad", user.DisplayName), OwnerID: user.ID}
	tx.Create(&group)
	tx.Create(&models.GroupMembership{GroupID: group.ID, UserID: user.ID, Role: "owner"})
	tx.Commit()

	h.writeTokenResponse(w, http.StatusOK, &user)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, serializeUser(currentUser(r)))
}

func (h *Handler) writeTokenResponse(w http.ResponseWriter, status int, user *models.User) {
	token, err := security.CreateAccessToken(user.ID, h.Config)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create authentication token.")
		return
	}
	writeJSON(w, status, TokenResp{
		AccessToken: token, TokenType: "bearer", User: serializeUser(user),
	})
}
