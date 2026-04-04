package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"gorm.io/gorm"

	"triequest-backend/internal/models"
	"triequest-backend/internal/services"
)

func (h *Handler) LookupFriend(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)

	rateLimitKey := fmt.Sprintf("%d:%s", user.ID, clientIP(r))
	decision := h.LookupRL.Check(rateLimitKey)
	if !decision.Allowed {
		writeErrorWithHeader(w, http.StatusTooManyRequests,
			"Too many username lookups. Please wait and try again.",
			map[string]string{"Retry-After": fmt.Sprintf("%d", decision.RetryAfterSeconds)})
		return
	}
	h.LookupRL.RecordAttempt(rateLimitKey)

	username := strings.TrimSpace(r.URL.Query().Get("username"))
	username = strings.TrimPrefix(strings.ToLower(username), "@")
	if len(username) < 3 || len(username) > 25 {
		writeError(w, http.StatusUnprocessableEntity, "Username must be between 3 and 25 characters.")
		return
	}

	if username == user.Username {
		writeError(w, http.StatusBadRequest, "You cannot add yourself as a friend.")
		return
	}

	friendIDs := acceptedFriendIDSet(h.DB, user.ID)
	pendingOut := pendingOutgoingSet(h.DB, user.ID)
	pendingIn := pendingIncomingSet(h.DB, user.ID)

	var found models.User
	if err := h.DB.Where("id != ? AND username = ?", user.ID, username).First(&found).Error; err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"user": nil})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"user": serializeFriendUser(&found, friendIDs, pendingOut, pendingIn),
	})
}

func (h *Handler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)

	rateLimitKey := fmt.Sprintf("%d:%s", user.ID, clientIP(r))
	decision := h.LookupRL.Check(rateLimitKey)
	if !decision.Allowed {
		writeErrorWithHeader(w, http.StatusTooManyRequests,
			"Too many search requests. Please wait and try again.",
			map[string]string{"Retry-After": fmt.Sprintf("%d", decision.RetryAfterSeconds)})
		return
	}
	h.LookupRL.RecordAttempt(rateLimitKey)

	q := strings.TrimSpace(strings.TrimPrefix(r.URL.Query().Get("q"), "@"))
	if len(q) < 2 {
		writeJSON(w, http.StatusOK, []FriendUserResp{})
		return
	}
	pattern := "%" + q + "%"

	var users []models.User
	h.DB.Where("id != ? AND (username LIKE ? OR display_name LIKE ?)", user.ID, pattern, pattern).
		Order("display_name ASC").Limit(10).Find(&users)

	if len(users) == 0 {
		writeJSON(w, http.StatusOK, []FriendUserResp{})
		return
	}

	friendIDs := acceptedFriendIDSet(h.DB, user.ID)
	pendingOut := pendingOutgoingSet(h.DB, user.ID)
	pendingIn := pendingIncomingSet(h.DB, user.ID)

	result := make([]FriendUserResp, 0, len(users))
	for _, u := range users {
		result = append(result, serializeFriendUser(&u, friendIDs, pendingOut, pendingIn))
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) AutocompleteUsers(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(strings.TrimPrefix(r.URL.Query().Get("q"), "@"))
	if q == "" {
		writeJSON(w, http.StatusOK, []string{})
		return
	}
	writeJSON(w, http.StatusOK, services.SearchUsernames(q, 10))
}

func (h *Handler) AutocompleteProblems(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		writeJSON(w, http.StatusOK, []string{})
		return
	}
	writeJSON(w, http.StatusOK, services.SearchProblems(q, 10))
}

func (h *Handler) ListFriends(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	friendIDs := acceptedFriendIDSet(h.DB, user.ID)
	if len(friendIDs) == 0 {
		writeJSON(w, http.StatusOK, []FriendUserResp{})
		return
	}

	ids := setToSlice(friendIDs)
	var users []models.User
	h.DB.Where("id IN ?", ids).Order("display_name ASC").Find(&users)

	result := make([]FriendUserResp, 0, len(users))
	for _, u := range users {
		result = append(result, serializeFriendUser(&u, friendIDs, nil, nil))
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) AddFriend(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	friendID, err := urlParamInt(r, "friendId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid friend ID.")
		return
	}

	if friendID == user.ID {
		writeError(w, http.StatusBadRequest, "You cannot add yourself as a friend.")
		return
	}

	var friend models.User
	if err := h.DB.First(&friend, friendID).Error; err != nil {
		writeError(w, http.StatusNotFound, "User not found.")
		return
	}

	// Check existing friendship from current user
	var existing models.Friendship
	if err := h.DB.Where("user_id = ? AND friend_id = ?", user.ID, friendID).First(&existing).Error; err == nil {
		status := "pending_outgoing"
		if existing.Status == "accepted" {
			status = "accepted"
		}
		writeJSON(w, http.StatusOK, FriendUserResp{
			ID: friend.ID, Username: friend.Username, DisplayName: friend.DisplayName,
			AvatarURL: friend.AvatarURL, IsFriend: existing.Status == "accepted",
			FriendshipStatus: status,
		})
		return
	}

	// Check reverse pending
	var reverse models.Friendship
	if err := h.DB.Where("user_id = ? AND friend_id = ? AND status = ?", friendID, user.ID, "pending").First(&reverse).Error; err == nil {
		reverse.Status = "accepted"
		h.DB.Save(&reverse)
		h.DB.Create(&models.Friendship{UserID: user.ID, FriendID: friendID, Status: "accepted"})
		writeJSON(w, http.StatusOK, FriendUserResp{
			ID: friend.ID, Username: friend.Username, DisplayName: friend.DisplayName,
			AvatarURL: friend.AvatarURL, IsFriend: true, FriendshipStatus: "accepted",
		})
		return
	}

	h.DB.Create(&models.Friendship{UserID: user.ID, FriendID: friendID, Status: "pending"})
	writeJSON(w, http.StatusOK, FriendUserResp{
		ID: friend.ID, Username: friend.Username, DisplayName: friend.DisplayName,
		AvatarURL: friend.AvatarURL, IsFriend: false, FriendshipStatus: "pending_outgoing",
	})
}

func (h *Handler) RemoveFriend(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	friendID, err := urlParamInt(r, "friendId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid friend ID.")
		return
	}

	h.DB.Where("user_id = ? AND friend_id = ?", user.ID, friendID).Delete(&models.Friendship{})
	h.DB.Where("user_id = ? AND friend_id = ?", friendID, user.ID).Delete(&models.Friendship{})

	// Remove from each other's groups
	h.DB.Where("user_id = ? AND group_id IN (SELECT id FROM groups WHERE owner_id = ?)", friendID, user.ID).
		Delete(&models.GroupMembership{})
	h.DB.Where("user_id = ? AND group_id IN (SELECT id FROM groups WHERE owner_id = ?)", user.ID, friendID).
		Delete(&models.GroupMembership{})

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ListFriendRequests(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)

	var pending []models.Friendship
	h.DB.Where("friend_id = ? AND status = ?", user.ID, "pending").
		Preload("User").
		Order("created_at DESC").
		Find(&pending)

	result := make([]FriendRequestResp, 0, len(pending))
	for _, req := range pending {
		result = append(result, FriendRequestResp{
			ID: req.ID,
			FromUser: FriendUserResp{
				ID: req.User.ID, Username: req.User.Username,
				DisplayName: req.User.DisplayName, AvatarURL: req.User.AvatarURL,
				IsFriend: false, FriendshipStatus: "pending_incoming",
			},
			CreatedAt: ensureAware(req.CreatedAt),
		})
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) AcceptFriendRequest(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	requestID, err := urlParamInt(r, "requestId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request ID.")
		return
	}

	var req models.Friendship
	if err := h.DB.Where("id = ? AND friend_id = ? AND status = ?", requestID, user.ID, "pending").
		Preload("User").First(&req).Error; err != nil {
		writeError(w, http.StatusNotFound, "Friend request not found.")
		return
	}

	req.Status = "accepted"
	h.DB.Save(&req)

	var existingReverse models.Friendship
	if err := h.DB.Where("user_id = ? AND friend_id = ?", user.ID, req.UserID).First(&existingReverse).Error; err != nil {
		h.DB.Create(&models.Friendship{UserID: user.ID, FriendID: req.UserID, Status: "accepted"})
	} else {
		existingReverse.Status = "accepted"
		h.DB.Save(&existingReverse)
	}

	writeJSON(w, http.StatusOK, FriendUserResp{
		ID: req.User.ID, Username: req.User.Username,
		DisplayName: req.User.DisplayName, AvatarURL: req.User.AvatarURL,
		IsFriend: true, FriendshipStatus: "accepted",
	})
}

func (h *Handler) RejectFriendRequest(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	requestID, err := urlParamInt(r, "requestId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request ID.")
		return
	}

	var req models.Friendship
	if err := h.DB.Where("id = ? AND friend_id = ? AND status = ?", requestID, user.ID, "pending").First(&req).Error; err != nil {
		writeError(w, http.StatusNotFound, "Friend request not found.")
		return
	}

	h.DB.Delete(&req)
	w.WriteHeader(http.StatusNoContent)
}

// Helper functions

func acceptedFriendIDSet(db *gorm.DB, userID int) map[int]struct{} {
	var ids []int
	db.Model(&models.Friendship{}).Where("user_id = ? AND status = ?", userID, "accepted").Pluck("friend_id", &ids)
	set := make(map[int]struct{}, len(ids))
	for _, id := range ids {
		set[id] = struct{}{}
	}
	return set
}

func pendingOutgoingSet(db *gorm.DB, userID int) map[int]struct{} {
	var ids []int
	db.Model(&models.Friendship{}).Where("user_id = ? AND status = ?", userID, "pending").Pluck("friend_id", &ids)
	set := make(map[int]struct{}, len(ids))
	for _, id := range ids {
		set[id] = struct{}{}
	}
	return set
}

func pendingIncomingSet(db *gorm.DB, userID int) map[int]struct{} {
	var ids []int
	db.Model(&models.Friendship{}).Where("friend_id = ? AND status = ?", userID, "pending").Pluck("user_id", &ids)
	set := make(map[int]struct{}, len(ids))
	for _, id := range ids {
		set[id] = struct{}{}
	}
	return set
}

func serializeFriendUser(u *models.User, friendIDs, pendingOut, pendingIn map[int]struct{}) FriendUserResp {
	status := "none"
	if _, ok := friendIDs[u.ID]; ok {
		status = "accepted"
	} else if pendingOut != nil {
		if _, ok := pendingOut[u.ID]; ok {
			status = "pending_outgoing"
		}
	}
	if status == "none" && pendingIn != nil {
		if _, ok := pendingIn[u.ID]; ok {
			status = "pending_incoming"
		}
	}

	_, isFriend := friendIDs[u.ID]
	return FriendUserResp{
		ID: u.ID, Username: u.Username, DisplayName: u.DisplayName,
		AvatarURL: u.AvatarURL, IsFriend: isFriend, FriendshipStatus: status,
	}
}

func setToSlice(s map[int]struct{}) []int {
	result := make([]int, 0, len(s))
	for k := range s {
		result = append(result, k)
	}
	return result
}
