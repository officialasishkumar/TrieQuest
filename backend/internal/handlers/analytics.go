package handlers

import (
	"net/http"

	"triequest-backend/internal/models"
	"triequest-backend/internal/services"
)

func (h *Handler) GroupAnalytics(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	groupID, err := urlParamInt(r, "groupId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID.")
		return
	}

	if _, err := getAccessibleGroup(h.DB, groupID, user.ID); err != nil {
		writeError(w, http.StatusNotFound, "Group not found.")
		return
	}

	window := queryStr(r, "window", "30d")

	var problems []models.ProblemShare
	h.DB.Where("group_id = ?", groupID).
		Preload("SharedBy").
		Order("shared_at DESC").
		Find(&problems)

	withUsers := make([]services.ProblemWithUser, 0, len(problems))
	for _, p := range problems {
		withUsers = append(withUsers, services.ProblemWithUser{
			ProblemShare:     p,
			SharedByUsername: p.SharedBy.Username,
		})
	}

	filtered := services.FilterProblemsByWindow(withUsers, window)
	writeJSON(w, http.StatusOK, services.BuildAnalytics(filtered))
}

func (h *Handler) PersonalAnalytics(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	window := queryStr(r, "window", "30d")

	var problems []models.ProblemShare
	h.DB.Where("shared_by_id = ?", user.ID).
		Preload("SharedBy").
		Order("shared_at DESC").
		Find(&problems)

	withUsers := make([]services.ProblemWithUser, 0, len(problems))
	for _, p := range problems {
		withUsers = append(withUsers, services.ProblemWithUser{
			ProblemShare:     p,
			SharedByUsername: p.SharedBy.Username,
		})
	}

	filtered := services.FilterProblemsByWindow(withUsers, window)
	writeJSON(w, http.StatusOK, services.BuildAnalytics(filtered))
}
