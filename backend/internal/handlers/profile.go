package handlers

import (
	"net/http"
	"net/url"
	"strings"
)

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, serializeUser(currentUser(r)))
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var req struct {
		DisplayName      string  `json:"displayName"`
		Bio              string  `json:"bio"`
		FavoriteTopic    *string `json:"favoriteTopic"`
		FavoritePlatform *string `json:"favoritePlatform"`
		AvatarURL        *string `json:"avatarUrl"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "Invalid request body.")
		return
	}

	displayName, err := validateRequiredText(req.DisplayName, "Display name")
	if err != nil {
		writeValidationError(w, "displayName", err.Error())
		return
	}

	bio := strings.TrimSpace(req.Bio)
	if hasControlChars(bio) {
		writeValidationError(w, "bio", "Bio contains unsupported control characters.")
		return
	}

	// Validate avatar URL
	if req.AvatarURL != nil && *req.AvatarURL != "" {
		parsed, parseErr := url.Parse(*req.AvatarURL)
		if parseErr != nil || (parsed.Scheme != "https" && parsed.Hostname() != "localhost" && parsed.Hostname() != "127.0.0.1") {
			writeValidationError(w, "avatarUrl", "Avatar URL must use HTTPS unless it targets localhost.")
			return
		}
	}

	user := currentUser(r)
	user.DisplayName = displayName
	user.Bio = bio
	user.FavoriteTopic = req.FavoriteTopic
	user.FavoritePlatform = req.FavoritePlatform
	user.AvatarURL = req.AvatarURL

	h.DB.Save(user)
	writeJSON(w, http.StatusOK, serializeUser(user))
}
