package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"

	"triequest-backend/internal/config"
	"triequest-backend/internal/middleware"
	"triequest-backend/internal/models"
	"triequest-backend/internal/services"
)

type Handler struct {
	DB       *gorm.DB
	Config   *config.Settings
	AuthRL   *services.FixedWindowRateLimiter
	LookupRL *services.FixedWindowRateLimiter
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, detail string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"detail": detail})
}

func writeErrorWithHeader(w http.ResponseWriter, status int, detail string, headers map[string]string) {
	for k, v := range headers {
		w.Header().Set(k, v)
	}
	writeError(w, status, detail)
}

func writeValidationError(w http.ResponseWriter, field, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnprocessableEntity)
	json.NewEncoder(w).Encode(map[string]any{
		"detail": []map[string]any{
			{"loc": []string{"body", field}, "msg": msg, "type": "value_error"},
		},
	})
}

func decodeJSON(r *http.Request, v any) error {
	decoder := json.NewDecoder(r.Body)
	return decoder.Decode(v)
}

func urlParamInt(r *http.Request, name string) (int, error) {
	return strconv.Atoi(chi.URLParam(r, name))
}

func queryStr(r *http.Request, name, fallback string) string {
	v := r.URL.Query().Get(name)
	if v == "" {
		return fallback
	}
	return v
}

func currentUser(r *http.Request) *models.User {
	return middleware.GetCurrentUser(r)
}

func clientIP(r *http.Request) string {
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		return strings.Split(forwarded, ",")[0]
	}
	if r.RemoteAddr != "" {
		parts := strings.Split(r.RemoteAddr, ":")
		if len(parts) > 0 {
			return parts[0]
		}
	}
	return "unknown"
}

func ensureAware(t time.Time) time.Time {
	if t.Location() == time.UTC {
		return t
	}
	return t.UTC()
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func titleCase(s string) string {
	words := strings.Fields(s)
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + strings.ToLower(w[1:])
		}
	}
	return strings.Join(words, " ")
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// Validation helpers matching Python backend

const minPasswordLength = 10

func validateUsername(value string) (string, error) {
	cleaned := strings.ToLower(strings.TrimSpace(value))
	if cleaned == "" {
		return "", fmt.Errorf("Username cannot be blank.")
	}
	if len(cleaned) < 3 || len(cleaned) > 24 {
		return "", fmt.Errorf("Username must be between 3 and 24 characters.")
	}
	if hasControlChars(cleaned) {
		return "", fmt.Errorf("Username contains unsupported control characters.")
	}
	for _, c := range cleaned {
		if c != '_' && !unicode.IsLetter(c) && !unicode.IsDigit(c) {
			return "", fmt.Errorf("Username may contain only letters, numbers, and underscores.")
		}
	}
	return cleaned, nil
}

func validatePassword(value string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("Password cannot be blank.")
	}
	if len(value) < minPasswordLength {
		return fmt.Errorf("Password must be at least %d characters long.", minPasswordLength)
	}
	if hasControlChars(value) {
		return fmt.Errorf("Password contains unsupported control characters.")
	}
	return nil
}

func validateRequiredText(value, fieldName string) (string, error) {
	cleaned := strings.TrimSpace(value)
	if cleaned == "" {
		return "", fmt.Errorf("%s cannot be blank.", fieldName)
	}
	if hasControlChars(cleaned) {
		return "", fmt.Errorf("%s contains unsupported control characters.", fieldName)
	}
	return cleaned, nil
}

func validateProblemURL(value string) (string, error) {
	cleaned := strings.TrimSpace(value)
	if cleaned == "" {
		return "", fmt.Errorf("Problem URL is required.")
	}
	if !strings.HasPrefix(cleaned, "https://") {
		return "", fmt.Errorf("Problem URL must use HTTPS.")
	}
	return cleaned, nil
}

func hasControlChars(s string) bool {
	for _, c := range s {
		if c < 32 {
			return true
		}
	}
	return false
}

// Response serialization types

type UserSummaryResp struct {
	ID               int     `json:"id"`
	Email            string  `json:"email"`
	Username         string  `json:"username"`
	DisplayName      string  `json:"display_name"`
	Bio              string  `json:"bio"`
	FavoriteTopic    *string `json:"favorite_topic"`
	FavoritePlatform *string `json:"favorite_platform"`
	AvatarURL        *string `json:"avatar_url"`
}

type TokenResp struct {
	AccessToken string          `json:"access_token"`
	TokenType   string          `json:"token_type"`
	User        UserSummaryResp `json:"user"`
}

type FriendUserResp struct {
	ID               int     `json:"id"`
	Username         string  `json:"username"`
	DisplayName      string  `json:"display_name"`
	AvatarURL        *string `json:"avatar_url"`
	IsFriend         bool    `json:"is_friend"`
	FriendshipStatus string  `json:"friendship_status"`
}

type FriendRequestResp struct {
	ID        int            `json:"id"`
	FromUser  FriendUserResp `json:"from_user"`
	CreatedAt time.Time      `json:"created_at"`
}

type GroupMemberResp struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
}

type GroupSummaryResp struct {
	ID            int               `json:"id"`
	Name          string            `json:"name"`
	MemberCount   int               `json:"member_count"`
	ProblemCount  int               `json:"problem_count"`
	LastActiveAt  *time.Time        `json:"last_active_at"`
	Members       []string          `json:"members"`
	MemberDetails []GroupMemberResp `json:"member_details"`
	IsOwner       bool              `json:"is_owner"`
}

type TopGroupResp struct {
	ID            int        `json:"id"`
	Name          string     `json:"name"`
	MemberCount   int        `json:"member_count"`
	ProblemCount  int        `json:"problem_count"`
	LastActiveAt  *time.Time `json:"last_active_at"`
	OwnerUsername string     `json:"owner_username"`
	JoinStatus    *string    `json:"join_status"`
}

type JoinRequestResp struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"group_id"`
	GroupName   string    `json:"group_name"`
	UserID      int       `json:"user_id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	AvatarURL   *string   `json:"avatar_url"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type ProblemSummaryResp struct {
	ID            int       `json:"id"`
	Title         string    `json:"title"`
	Contest       *string   `json:"contest"`
	Tags          *string   `json:"tags"`
	Difficulty    string    `json:"difficulty"`
	URL           string    `json:"url"`
	Platform      string    `json:"platform"`
	SharedBy      string    `json:"shared_by"`
	ThumbnailURL  *string   `json:"thumbnail_url"`
	SolvedByCount *int      `json:"solved_by_count"`
	SharedAt      time.Time `json:"shared_at"`
}

type ChallengeProblemResp struct {
	ID           int     `json:"id"`
	ProblemURL   string  `json:"problem_url"`
	Title        string  `json:"title"`
	ContestID    *int    `json:"contest_id"`
	ProblemIndex *string `json:"problem_index"`
	Rating       *int    `json:"rating"`
	Tags         *string `json:"tags"`
	OrderIndex   int     `json:"order_index"`
}

type ChallengeParticipantResp struct {
	UserID      int     `json:"user_id"`
	Username    string  `json:"username"`
	DisplayName string  `json:"display_name"`
	AvatarURL   *string `json:"avatar_url"`
	Status      string  `json:"status"`
}

type ChallengeSummaryResp struct {
	ID           int                        `json:"id"`
	Title        string                     `json:"title"`
	Platform     string                     `json:"platform"`
	NumProblems  int                        `json:"num_problems"`
	MinRating    *int                       `json:"min_rating"`
	MaxRating    *int                       `json:"max_rating"`
	Tags         *string                    `json:"tags"`
	Status       string                     `json:"status"`
	CreatedBy    string                     `json:"created_by"`
	CreatedByID  int                        `json:"created_by_id"`
	Participants []ChallengeParticipantResp `json:"participants"`
	Problems     []ChallengeProblemResp     `json:"problems"`
	CreatedAt    time.Time                  `json:"created_at"`
	StartedAt    *time.Time                 `json:"started_at"`
}

func serializeUser(u *models.User) UserSummaryResp {
	bio := u.Bio
	if bio == "" {
		bio = ""
	}
	return UserSummaryResp{
		ID: u.ID, Email: u.Email, Username: u.Username,
		DisplayName: u.DisplayName, Bio: bio,
		FavoriteTopic: u.FavoriteTopic, FavoritePlatform: u.FavoritePlatform,
		AvatarURL: u.AvatarURL,
	}
}

func serializeProblem(p *models.ProblemShare) ProblemSummaryResp {
	difficulty := p.Difficulty
	if difficulty == "" {
		difficulty = "Unknown"
	}
	label := services.PlatformLabels[p.Platform]
	if label == "" {
		label = titleCase(p.Platform)
	}
	return ProblemSummaryResp{
		ID: p.ID, Title: p.Title, Contest: p.Contest, Tags: p.Tags,
		Difficulty:   services.NormalizeDifficultyForPlatform(p.Platform, difficulty, p.PlatformProblemID),
		URL:          p.ProblemURL, Platform: label,
		SharedBy:     p.SharedBy.Username,
		ThumbnailURL: p.ThumbnailURL, SolvedByCount: p.SolvedByCount,
		SharedAt: ensureAware(p.SharedAt),
	}
}

func serializeGroup(g *models.Group, currentUserID int) GroupSummaryResp {
	var lastActive *time.Time
	for _, p := range g.Problems {
		t := ensureAware(p.SharedAt)
		if lastActive == nil || t.After(*lastActive) {
			lastActive = &t
		}
	}

	members := make([]string, 0, len(g.Memberships))
	details := make([]GroupMemberResp, 0, len(g.Memberships))
	for _, m := range g.Memberships {
		members = append(members, m.User.Username)
		details = append(details, GroupMemberResp{ID: m.User.ID, Username: m.User.Username})
	}

	return GroupSummaryResp{
		ID: g.ID, Name: g.Name, MemberCount: len(g.Memberships),
		ProblemCount: len(g.Problems), LastActiveAt: lastActive,
		Members: members, MemberDetails: details,
		IsOwner: g.OwnerID == currentUserID,
	}
}

func serializeChallenge(c *models.Challenge) ChallengeSummaryResp {
	participants := make([]ChallengeParticipantResp, 0, len(c.Participants))
	for _, p := range c.Participants {
		participants = append(participants, ChallengeParticipantResp{
			UserID: p.User.ID, Username: p.User.Username,
			DisplayName: p.User.DisplayName, AvatarURL: p.User.AvatarURL,
			Status: p.Status,
		})
	}

	problems := make([]ChallengeProblemResp, 0, len(c.Problems))
	for _, p := range c.Problems {
		problems = append(problems, ChallengeProblemResp{
			ID: p.ID, ProblemURL: p.ProblemURL, Title: p.Title,
			ContestID: p.ContestID, ProblemIndex: p.ProblemIndex,
			Rating: p.Rating, Tags: p.Tags, OrderIndex: p.OrderIndex,
		})
	}

	var startedAt *time.Time
	if c.StartedAt != nil {
		t := ensureAware(*c.StartedAt)
		startedAt = &t
	}

	return ChallengeSummaryResp{
		ID: c.ID, Title: c.Title, Platform: c.Platform,
		NumProblems: c.NumProblems, MinRating: c.MinRating, MaxRating: c.MaxRating,
		Tags: c.Tags, Status: c.Status,
		CreatedBy: c.CreatedBy.Username, CreatedByID: c.CreatedByID,
		Participants: participants, Problems: problems,
		CreatedAt: ensureAware(c.CreatedAt), StartedAt: startedAt,
	}
}

func getAccessibleGroup(db *gorm.DB, groupID, userID int) (*models.Group, error) {
	var group models.Group
	err := db.
		Joins("JOIN group_memberships ON group_memberships.group_id = groups.id").
		Where("groups.id = ? AND group_memberships.user_id = ?", groupID, userID).
		Preload("Memberships.User").
		Preload("Problems").
		First(&group).Error
	if err != nil {
		return nil, err
	}
	return &group, nil
}
