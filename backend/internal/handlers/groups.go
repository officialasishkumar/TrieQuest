package handlers

import (
	"net/http"

	"triequest-backend/internal/models"
)

func (h *Handler) ListGroups(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)

	var groups []models.Group
	h.DB.
		Joins("JOIN group_memberships ON group_memberships.group_id = groups.id").
		Where("group_memberships.user_id = ?", user.ID).
		Preload("Memberships.User").
		Preload("Problems").
		Order("groups.created_at ASC").
		Find(&groups)

	result := make([]GroupSummaryResp, 0, len(groups))
	for _, g := range groups {
		result = append(result, serializeGroup(&g, user.ID))
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	var req struct {
		Name      string `json:"name"`
		MemberIDs []int  `json:"member_ids"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "Invalid request body.")
		return
	}

	name, err := validateRequiredText(req.Name, "Group name")
	if err != nil {
		writeValidationError(w, "name", err.Error())
		return
	}

	tx := h.DB.Begin()
	group := models.Group{Name: name, OwnerID: user.ID}
	tx.Create(&group)
	tx.Create(&models.GroupMembership{GroupID: group.ID, UserID: user.ID, Role: "owner"})

	seen := map[int]struct{}{user.ID: {}}
	for _, memberID := range req.MemberIDs {
		if memberID <= 0 {
			continue
		}
		if _, exists := seen[memberID]; exists {
			continue
		}
		seen[memberID] = struct{}{}
		var u models.User
		if tx.First(&u, memberID).Error == nil {
			tx.Create(&models.GroupMembership{GroupID: group.ID, UserID: memberID, Role: "member"})
		}
	}
	tx.Commit()

	var refreshed models.Group
	h.DB.Preload("Memberships.User").Preload("Problems").First(&refreshed, group.ID)
	writeJSON(w, http.StatusCreated, serializeGroup(&refreshed, user.ID))
}

func (h *Handler) TopGroups(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)

	type topRow struct {
		ID           int
		Name         string
		OwnerID      int
		MemberCount  int
		ProblemCount int
		LastActiveAt *string
	}

	var rows []topRow
	h.DB.Raw(`
		SELECT g.id, g.name, g.owner_id,
			COUNT(DISTINCT gm.id) AS member_count,
			COUNT(DISTINCT ps.id) AS problem_count,
			MAX(ps.shared_at) AS last_active_at
		FROM `+"`groups`"+` g
		JOIN group_memberships gm ON gm.group_id = g.id
		LEFT JOIN problem_shares ps ON ps.group_id = g.id
		GROUP BY g.id
		HAVING COUNT(DISTINCT gm.id) > 1
		ORDER BY COUNT(DISTINCT ps.id) DESC, COUNT(DISTINCT gm.id) DESC
		LIMIT 20
	`).Scan(&rows)

	if len(rows) == 0 {
		writeJSON(w, http.StatusOK, []TopGroupResp{})
		return
	}

	ownerIDs := make([]int, 0)
	groupIDs := make([]int, 0)
	for _, row := range rows {
		ownerIDs = append(ownerIDs, row.OwnerID)
		groupIDs = append(groupIDs, row.ID)
	}

	var owners []models.User
	h.DB.Where("id IN ?", ownerIDs).Find(&owners)
	ownerMap := make(map[int]string)
	for _, o := range owners {
		ownerMap[o.ID] = o.Username
	}

	var myMembershipIDs []int
	h.DB.Model(&models.GroupMembership{}).Where("group_id IN ? AND user_id = ?", groupIDs, user.ID).
		Pluck("group_id", &myMembershipIDs)
	myMemberSet := toSet(myMembershipIDs)

	var myPendingIDs []int
	h.DB.Model(&models.JoinRequest{}).Where("group_id IN ? AND user_id = ? AND status = ?", groupIDs, user.ID, "pending").
		Pluck("group_id", &myPendingIDs)
	myPendingSet := toSet(myPendingIDs)

	result := make([]TopGroupResp, 0, len(rows))
	for _, row := range rows {
		var joinStatus *string
		if _, ok := myMemberSet[row.ID]; ok {
			s := "member"
			joinStatus = &s
		} else if _, ok := myPendingSet[row.ID]; ok {
			s := "pending"
			joinStatus = &s
		}
		result = append(result, TopGroupResp{
			ID: row.ID, Name: row.Name, MemberCount: row.MemberCount,
			ProblemCount: row.ProblemCount,
			OwnerUsername: ownerMap[row.OwnerID], JoinStatus: joinStatus,
		})
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) ListJoinRequests(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)

	var requests []models.JoinRequest
	h.DB.
		Joins("JOIN `groups` ON `groups`.id = join_requests.group_id").
		Where("`groups`.owner_id = ? AND join_requests.status = ?", user.ID, "pending").
		Preload("User").
		Preload("Group").
		Order("join_requests.created_at DESC").
		Find(&requests)

	result := make([]JoinRequestResp, 0, len(requests))
	for _, req := range requests {
		result = append(result, JoinRequestResp{
			ID: req.ID, GroupID: req.GroupID, GroupName: req.Group.Name,
			UserID: req.User.ID, Username: req.User.Username,
			DisplayName: req.User.DisplayName, AvatarURL: req.User.AvatarURL,
			Status: req.Status, CreatedAt: ensureAware(req.CreatedAt),
		})
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) AcceptJoinRequest(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	requestID, err := urlParamInt(r, "requestId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request ID.")
		return
	}

	var jr models.JoinRequest
	if err := h.DB.Preload("Group").Where("id = ? AND status = ?", requestID, "pending").First(&jr).Error; err != nil {
		writeError(w, http.StatusNotFound, "Join request not found.")
		return
	}
	if jr.Group.OwnerID != user.ID {
		writeError(w, http.StatusNotFound, "Join request not found.")
		return
	}

	jr.Status = "accepted"
	h.DB.Save(&jr)
	h.DB.Create(&models.GroupMembership{GroupID: jr.GroupID, UserID: jr.UserID, Role: "member"})
	writeJSON(w, http.StatusOK, map[string]string{"status": "accepted"})
}

func (h *Handler) RejectJoinRequest(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	requestID, err := urlParamInt(r, "requestId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request ID.")
		return
	}

	var jr models.JoinRequest
	if err := h.DB.Preload("Group").Where("id = ? AND status = ?", requestID, "pending").First(&jr).Error; err != nil {
		writeError(w, http.StatusNotFound, "Join request not found.")
		return
	}
	if jr.Group.OwnerID != user.ID {
		writeError(w, http.StatusNotFound, "Join request not found.")
		return
	}

	jr.Status = "rejected"
	h.DB.Save(&jr)
	writeJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}

func (h *Handler) RequestJoinGroup(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	groupID, err := urlParamInt(r, "groupId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID.")
		return
	}

	var group models.Group
	if err := h.DB.First(&group, groupID).Error; err != nil {
		writeError(w, http.StatusNotFound, "Group not found.")
		return
	}

	var membership models.GroupMembership
	if h.DB.Where("group_id = ? AND user_id = ?", groupID, user.ID).First(&membership).Error == nil {
		writeError(w, http.StatusConflict, "You are already a member of this squad.")
		return
	}

	var existing models.JoinRequest
	if h.DB.Where("group_id = ? AND user_id = ? AND status = ?", groupID, user.ID, "pending").First(&existing).Error == nil {
		writeError(w, http.StatusConflict, "You already have a pending request for this squad.")
		return
	}

	h.DB.Create(&models.JoinRequest{GroupID: groupID, UserID: user.ID, Status: "pending"})
	writeJSON(w, http.StatusCreated, map[string]string{"status": "pending"})
}

func (h *Handler) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	groupID, err := urlParamInt(r, "groupId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID.")
		return
	}

	var group models.Group
	if err := h.DB.Where("id = ? AND owner_id = ?", groupID, user.ID).First(&group).Error; err != nil {
		writeError(w, http.StatusNotFound, "Group not found or you don't have permission.")
		return
	}

	h.DB.Delete(&group)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) AddGroupMembers(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	groupID, err := urlParamInt(r, "groupId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID.")
		return
	}

	var req struct {
		MemberIDs []int `json:"member_ids"`
	}
	if err := decodeJSON(r, &req); err != nil || len(req.MemberIDs) == 0 {
		writeError(w, http.StatusUnprocessableEntity, "Invalid request body.")
		return
	}

	group, err := getAccessibleGroup(h.DB, groupID, user.ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Group not found.")
		return
	}

	existingIDs := make(map[int]struct{})
	for _, m := range group.Memberships {
		existingIDs[m.UserID] = struct{}{}
	}

	for _, memberID := range req.MemberIDs {
		if _, exists := existingIDs[memberID]; exists || memberID <= 0 {
			continue
		}
		var u models.User
		if h.DB.First(&u, memberID).Error == nil {
			h.DB.Create(&models.GroupMembership{GroupID: group.ID, UserID: memberID, Role: "member"})
		}
	}

	var refreshed models.Group
	h.DB.Preload("Memberships.User").Preload("Problems").First(&refreshed, group.ID)
	writeJSON(w, http.StatusOK, serializeGroup(&refreshed, user.ID))
}

func (h *Handler) RemoveGroupMember(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	groupID, err := urlParamInt(r, "groupId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID.")
		return
	}
	memberUserID, err := urlParamInt(r, "userId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid user ID.")
		return
	}

	group, err := getAccessibleGroup(h.DB, groupID, user.ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Group not found.")
		return
	}

	if memberUserID != user.ID && group.OwnerID != user.ID {
		writeError(w, http.StatusForbidden, "Not authorized to remove this member.")
		return
	}

	var membership models.GroupMembership
	if err := h.DB.Where("group_id = ? AND user_id = ?", group.ID, memberUserID).First(&membership).Error; err != nil {
		writeError(w, http.StatusNotFound, "Member not found in group.")
		return
	}

	if memberUserID == group.OwnerID {
		var nextMember models.GroupMembership
		if h.DB.Where("group_id = ? AND user_id != ?", group.ID, memberUserID).Order("created_at ASC").First(&nextMember).Error == nil {
			group.OwnerID = nextMember.UserID
			nextMember.Role = "owner"
			h.DB.Save(&group)
			h.DB.Save(&nextMember)
			h.DB.Delete(&membership)
		} else {
			h.DB.Delete(&group)
		}
	} else {
		h.DB.Delete(&membership)
	}

	w.WriteHeader(http.StatusNoContent)
}

func toSet(ids []int) map[int]struct{} {
	s := make(map[int]struct{}, len(ids))
	for _, id := range ids {
		s[id] = struct{}{}
	}
	return s
}
