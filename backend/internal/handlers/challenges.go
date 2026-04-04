package handlers

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"triequest-backend/internal/models"
	"triequest-backend/internal/services"
)

func (h *Handler) CreateChallenge(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)

	var req struct {
		Title         string   `json:"title"`
		Platform      string   `json:"platform"`
		NumProblems   int      `json:"num_problems"`
		MinRating     *int     `json:"min_rating"`
		MaxRating     *int     `json:"max_rating"`
		Tags          []string `json:"tags"`
		InviteUserIDs []int    `json:"invite_user_ids"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "Invalid request body.")
		return
	}

	title, err := validateRequiredText(req.Title, "Challenge title")
	if err != nil {
		writeValidationError(w, "title", err.Error())
		return
	}

	if req.Platform == "" {
		req.Platform = "codeforces"
	}
	if req.NumProblems < 1 {
		req.NumProblems = 3
	}
	if req.NumProblems > 10 {
		req.NumProblems = 10
	}

	var tagsStr *string
	if len(req.Tags) > 0 {
		s := strings.Join(req.Tags, ",")
		tagsStr = &s
	}

	challenge := models.Challenge{
		CreatedByID: user.ID,
		Title:       title,
		Platform:    req.Platform,
		NumProblems: req.NumProblems,
		MinRating:   req.MinRating,
		MaxRating:   req.MaxRating,
		Tags:        tagsStr,
		Status:      "pending",
	}

	tx := h.DB.Begin()
	tx.Create(&challenge)

	now := time.Now().UTC()
	tx.Create(&models.ChallengeParticipant{
		ChallengeID: challenge.ID, UserID: user.ID, Status: "accepted", JoinedAt: &now,
	})
	for _, uid := range req.InviteUserIDs {
		if uid == user.ID {
			continue
		}
		tx.Create(&models.ChallengeParticipant{
			ChallengeID: challenge.ID, UserID: uid, Status: "invited",
		})
	}

	// Fetch Codeforces problems
	var tagsSlice []string
	if len(req.Tags) > 0 {
		tagsSlice = req.Tags
	}
	cfProblems, cfErr := services.FetchCFProblems(tagsSlice, req.MinRating, req.MaxRating)
	if cfErr == nil {
		selected := services.PickRandomProblems(cfProblems, req.NumProblems)
		for idx, prob := range selected {
			var probTags *string
			if len(prob.Tags) > 0 {
				s := strings.Join(prob.Tags, ",")
				probTags = &s
			}
			tx.Create(&models.ChallengeProblem{
				ChallengeID:  challenge.ID,
				ProblemURL:   prob.URL(),
				Title:        prob.Name,
				ContestID:    &prob.ContestID,
				ProblemIndex: &prob.Index,
				Rating:       prob.Rating,
				Tags:         probTags,
				OrderIndex:   idx,
			})
		}
	}

	tx.Commit()

	var refreshed models.Challenge
	h.DB.Preload("Participants.User").Preload("Problems").Preload("CreatedBy").
		First(&refreshed, challenge.ID)

	sort.Slice(refreshed.Problems, func(i, j int) bool {
		return refreshed.Problems[i].OrderIndex < refreshed.Problems[j].OrderIndex
	})

	writeJSON(w, http.StatusCreated, serializeChallenge(&refreshed))
}

func (h *Handler) ListChallenges(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)

	var challenges []models.Challenge
	h.DB.
		Joins("JOIN challenge_participants ON challenge_participants.challenge_id = challenges.id").
		Where("challenge_participants.user_id = ?", user.ID).
		Preload("Participants.User").Preload("Problems").Preload("CreatedBy").
		Order("challenges.created_at DESC").
		Find(&challenges)

	// Deduplicate
	seen := make(map[int]struct{})
	result := make([]ChallengeSummaryResp, 0, len(challenges))
	for _, c := range challenges {
		if _, ok := seen[c.ID]; ok {
			continue
		}
		seen[c.ID] = struct{}{}
		sort.Slice(c.Problems, func(i, j int) bool {
			return c.Problems[i].OrderIndex < c.Problems[j].OrderIndex
		})
		result = append(result, serializeChallenge(&c))
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) GetChallenge(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	challengeID, err := urlParamInt(r, "challengeId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid challenge ID.")
		return
	}

	var challenge models.Challenge
	if err := h.DB.Preload("Participants.User").Preload("Problems").Preload("CreatedBy").
		First(&challenge, challengeID).Error; err != nil {
		writeError(w, http.StatusNotFound, "Challenge not found.")
		return
	}

	found := false
	for _, p := range challenge.Participants {
		if p.UserID == user.ID {
			found = true
			break
		}
	}
	if !found {
		writeError(w, http.StatusNotFound, "Challenge not found.")
		return
	}

	sort.Slice(challenge.Problems, func(i, j int) bool {
		return challenge.Problems[i].OrderIndex < challenge.Problems[j].OrderIndex
	})
	writeJSON(w, http.StatusOK, serializeChallenge(&challenge))
}

func (h *Handler) AcceptChallenge(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	challengeID, err := urlParamInt(r, "challengeId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid challenge ID.")
		return
	}

	var challenge models.Challenge
	if err := h.DB.Preload("Participants.User").Preload("Problems").Preload("CreatedBy").
		First(&challenge, challengeID).Error; err != nil {
		writeError(w, http.StatusNotFound, "Challenge not found.")
		return
	}

	var participant *models.ChallengeParticipant
	for i := range challenge.Participants {
		if challenge.Participants[i].UserID == user.ID {
			participant = &challenge.Participants[i]
			break
		}
	}
	if participant == nil {
		writeError(w, http.StatusNotFound, "Challenge not found.")
		return
	}
	if participant.Status != "invited" {
		writeError(w, http.StatusBadRequest, "Already responded.")
		return
	}

	now := time.Now().UTC()
	participant.Status = "accepted"
	participant.JoinedAt = &now
	h.DB.Save(participant)

	allAccepted := true
	for _, p := range challenge.Participants {
		if p.UserID == user.ID {
			continue // already accepted above
		}
		if p.Status != "accepted" {
			allAccepted = false
			break
		}
	}
	if allAccepted && challenge.Status == "pending" {
		challenge.Status = "active"
		challenge.StartedAt = &now
		h.DB.Save(&challenge)
	}

	h.DB.Preload("Participants.User").Preload("Problems").Preload("CreatedBy").
		First(&challenge, challengeID)
	sort.Slice(challenge.Problems, func(i, j int) bool {
		return challenge.Problems[i].OrderIndex < challenge.Problems[j].OrderIndex
	})
	writeJSON(w, http.StatusOK, serializeChallenge(&challenge))
}

func (h *Handler) DeclineChallenge(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	challengeID, err := urlParamInt(r, "challengeId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid challenge ID.")
		return
	}

	var participant models.ChallengeParticipant
	if err := h.DB.Where("challenge_id = ? AND user_id = ?", challengeID, user.ID).
		First(&participant).Error; err != nil {
		writeError(w, http.StatusNotFound, "Challenge not found.")
		return
	}
	if participant.Status != "invited" {
		writeError(w, http.StatusBadRequest, "Already responded.")
		return
	}

	participant.Status = "declined"
	h.DB.Save(&participant)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) StartChallenge(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	challengeID, err := urlParamInt(r, "challengeId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid challenge ID.")
		return
	}

	var challenge models.Challenge
	if err := h.DB.Preload("Participants.User").Preload("Problems").Preload("CreatedBy").
		First(&challenge, challengeID).Error; err != nil || challenge.CreatedByID != user.ID {
		writeError(w, http.StatusNotFound, "Challenge not found.")
		return
	}
	if challenge.Status != "pending" {
		writeError(w, http.StatusBadRequest, "Challenge is not pending.")
		return
	}

	for _, p := range challenge.Participants {
		if p.Status == "declined" {
			writeError(w, http.StatusBadRequest, "Some participants have declined.")
			return
		}
	}

	now := time.Now().UTC()
	challenge.Status = "active"
	challenge.StartedAt = &now
	h.DB.Save(&challenge)

	sort.Slice(challenge.Problems, func(i, j int) bool {
		return challenge.Problems[i].OrderIndex < challenge.Problems[j].OrderIndex
	})
	writeJSON(w, http.StatusOK, serializeChallenge(&challenge))
}
