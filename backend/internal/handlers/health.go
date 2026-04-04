package handlers

import (
	"net/http"

	"triequest-backend/internal/database"
	"triequest-backend/internal/models"
)

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	if err := database.HealthCheck(h.DB); err != nil {
		writeError(w, http.StatusServiceUnavailable, "Database unavailable.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "database": "ok"})
}

func (h *Handler) GlobalStats(w http.ResponseWriter, r *http.Request) {
	var groupsCreated, problemsShared, activeMembers int64
	h.DB.Model(&models.Group{}).Count(&groupsCreated)
	h.DB.Model(&models.ProblemShare{}).Count(&problemsShared)
	h.DB.Model(&models.User{}).Count(&activeMembers)

	writeJSON(w, http.StatusOK, map[string]int64{
		"groups_created":  groupsCreated,
		"problems_shared": problemsShared,
		"active_members":  activeMembers,
	})
}
