package handlers

import (
	"net/http"

	"triequest-backend/internal/models"
	"triequest-backend/internal/services"
)

func (h *Handler) ListGroupProblems(w http.ResponseWriter, r *http.Request) {
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

	var problems []models.ProblemShare
	h.DB.Where("group_id = ?", groupID).
		Preload("SharedBy").
		Order("shared_at DESC").
		Find(&problems)

	result := make([]ProblemSummaryResp, 0, len(problems))
	for _, p := range problems {
		result = append(result, serializeProblem(&p))
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) AddProblem(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	groupID, err := urlParamInt(r, "groupId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID.")
		return
	}

	group, err := getAccessibleGroup(h.DB, groupID, user.ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Group not found.")
		return
	}

	var req struct {
		URL string `json:"url"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "Invalid request body.")
		return
	}

	cleanedURL, err := validateProblemURL(req.URL)
	if err != nil {
		writeValidationError(w, "url", err.Error())
		return
	}

	resolved, err := services.ResolveProblem(cleanedURL)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	problem := models.ProblemShare{
		GroupID:           group.ID,
		SharedByID:        user.ID,
		Platform:          resolved.Platform,
		ProblemURL:        resolved.ProblemURL,
		PlatformProblemID: resolved.PlatformProblemID,
		Title:             resolved.Title,
		Contest:           resolved.Contest,
		Tags:              resolved.Tags,
		Difficulty:        resolved.Difficulty,
		ThumbnailURL:      resolved.ThumbnailURL,
		SolvedByCount:     resolved.SolvedByCount,
		ProblemSignature:  resolved.Signature(),
	}
	h.DB.Create(&problem)

	services.AddProblemToTrie(problem.Title)

	h.DB.Preload("SharedBy").First(&problem, problem.ID)
	writeJSON(w, http.StatusCreated, serializeProblem(&problem))
}

func (h *Handler) RemoveGroupProblem(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	groupID, err := urlParamInt(r, "groupId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID.")
		return
	}
	problemID, err := urlParamInt(r, "problemId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid problem ID.")
		return
	}

	group, err := getAccessibleGroup(h.DB, groupID, user.ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Group not found.")
		return
	}

	var problem models.ProblemShare
	if err := h.DB.Where("id = ? AND group_id = ?", problemID, group.ID).First(&problem).Error; err != nil {
		writeError(w, http.StatusNotFound, "Problem not found in group.")
		return
	}

	if problem.SharedByID != user.ID && group.OwnerID != user.ID {
		writeError(w, http.StatusForbidden, "Not authorized to remove this problem.")
		return
	}

	h.DB.Delete(&problem)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ProblemsFeed(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)

	var problems []models.ProblemShare
	h.DB.
		Joins("JOIN `groups` ON `groups`.id = problem_shares.group_id").
		Joins("JOIN group_memberships ON group_memberships.group_id = `groups`.id").
		Where("group_memberships.user_id = ?", user.ID).
		Preload("SharedBy").
		Order("problem_shares.shared_at DESC").
		Limit(50).
		Find(&problems)

	result := make([]ProblemSummaryResp, 0, len(problems))
	for _, p := range problems {
		result = append(result, serializeProblem(&p))
	}
	writeJSON(w, http.StatusOK, result)
}
