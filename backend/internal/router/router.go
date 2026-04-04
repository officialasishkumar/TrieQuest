package router

import (
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"gorm.io/gorm"

	"triequest-backend/internal/config"
	"triequest-backend/internal/handlers"
	"triequest-backend/internal/middleware"
	"triequest-backend/internal/services"
)

func New(db *gorm.DB, cfg *config.Settings) *chi.Mux {
	r := chi.NewRouter()

	h := &handlers.Handler{
		DB:     db,
		Config: cfg,
		AuthRL: services.NewFixedWindowRateLimiter(
			cfg.AuthRateLimitMaxAttempts,
			cfg.AuthRateLimitWindowSeconds,
		),
		LookupRL: services.NewFixedWindowRateLimiter(
			cfg.FriendLookupRateLimitMaxAttempts,
			cfg.FriendLookupRateLimitWindowSecs,
		),
	}

	// Global middleware
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Recoverer)
	r.Use(middleware.SecurityHeaders(cfg.Environment))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Public routes
	r.Get("/api/health", h.Health)
	r.Get("/api/stats", h.GlobalStats)
	r.Get("/api/auth/check-username", h.CheckUsername)
	r.Post("/api/auth/register", h.Register)
	r.Post("/api/auth/login", h.Login)
	r.Post("/api/auth/google", h.GoogleAuth)

	// Authenticated routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(db, cfg))

		r.Get("/api/auth/me", h.Me)
		r.Get("/api/profile", h.GetProfile)
		r.Patch("/api/profile", h.UpdateProfile)

		// Friends
		r.Get("/api/friends/lookup", h.LookupFriend)
		r.Get("/api/friends/search", h.SearchUsers)
		r.Get("/api/friends/list", h.ListFriends)
		r.Post("/api/friends/{friendId}", h.AddFriend)
		r.Delete("/api/friends/{friendId}", h.RemoveFriend)
		r.Get("/api/friends/requests", h.ListFriendRequests)
		r.Post("/api/friends/requests/{requestId}/accept", h.AcceptFriendRequest)
		r.Post("/api/friends/requests/{requestId}/reject", h.RejectFriendRequest)

		// Autocomplete
		r.Get("/api/autocomplete/users", h.AutocompleteUsers)
		r.Get("/api/autocomplete/problems", h.AutocompleteProblems)

		// Groups (fixed routes before parameterized)
		r.Get("/api/groups", h.ListGroups)
		r.Post("/api/groups", h.CreateGroup)
		r.Get("/api/groups/top", h.TopGroups)
		r.Get("/api/groups/join-requests", h.ListJoinRequests)
		r.Post("/api/groups/join-requests/{requestId}/accept", h.AcceptJoinRequest)
		r.Post("/api/groups/join-requests/{requestId}/reject", h.RejectJoinRequest)

		// Groups (parameterized routes)
		r.Post("/api/groups/{groupId}/request-join", h.RequestJoinGroup)
		r.Delete("/api/groups/{groupId}", h.DeleteGroup)
		r.Post("/api/groups/{groupId}/members", h.AddGroupMembers)
		r.Delete("/api/groups/{groupId}/members/{userId}", h.RemoveGroupMember)
		r.Get("/api/groups/{groupId}/problems", h.ListGroupProblems)
		r.Post("/api/groups/{groupId}/problems", h.AddProblem)
		r.Delete("/api/groups/{groupId}/problems/{problemId}", h.RemoveGroupProblem)
		r.Get("/api/groups/{groupId}/analytics", h.GroupAnalytics)

		// Analytics
		r.Get("/api/analytics/me", h.PersonalAnalytics)

		// Problems feed
		r.Get("/api/problems/feed", h.ProblemsFeed)

		// Challenges
		r.Post("/api/challenges", h.CreateChallenge)
		r.Get("/api/challenges", h.ListChallenges)
		r.Get("/api/challenges/{challengeId}", h.GetChallenge)
		r.Post("/api/challenges/{challengeId}/accept", h.AcceptChallenge)
		r.Post("/api/challenges/{challengeId}/decline", h.DeclineChallenge)
		r.Post("/api/challenges/{challengeId}/start", h.StartChallenge)
	})

	return r
}
