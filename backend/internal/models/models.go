package models

import (
	"time"
)

type User struct {
	ID               int              `gorm:"primaryKey;autoIncrement" json:"id"`
	Email            string           `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Username         string           `gorm:"type:varchar(32);uniqueIndex;not null" json:"username"`
	DisplayName      string           `gorm:"type:varchar(120);not null" json:"display_name"`
	Bio              string           `gorm:"type:varchar(255);default:''" json:"bio"`
	FavoriteTopic    *string          `gorm:"type:varchar(120)" json:"favorite_topic"`
	FavoritePlatform *string          `gorm:"type:varchar(120)" json:"favorite_platform"`
	AvatarURL        *string          `gorm:"type:varchar(500)" json:"avatar_url"`
	PasswordHash     *string          `gorm:"type:varchar(255)" json:"-"`
	GoogleID         *string          `gorm:"type:varchar(255);uniqueIndex" json:"-"`
	AuthProvider     string           `gorm:"type:varchar(32);default:'local'" json:"-"`
	CreatedAt        time.Time        `gorm:"type:datetime;not null" json:"created_at"`
	OwnedGroups      []Group          `gorm:"foreignKey:OwnerID" json:"-"`
	Memberships      []GroupMembership `gorm:"foreignKey:UserID" json:"-"`
	SharedProblems   []ProblemShare   `gorm:"foreignKey:SharedByID" json:"-"`
	Friends          []Friendship     `gorm:"foreignKey:UserID" json:"-"`
}

func (User) TableName() string { return "users" }

type Friendship struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    int       `gorm:"index;not null" json:"user_id"`
	FriendID  int       `gorm:"index;not null" json:"friend_id"`
	Status    string    `gorm:"type:varchar(20);default:'pending'" json:"status"`
	CreatedAt time.Time `gorm:"type:datetime;not null" json:"created_at"`
	User      User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Friend    User      `gorm:"foreignKey:FriendID;constraint:OnDelete:CASCADE" json:"-"`
}

func (Friendship) TableName() string { return "friendships" }

type Group struct {
	ID          int               `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string            `gorm:"type:varchar(120);index;not null" json:"name"`
	OwnerID     int               `gorm:"index;not null" json:"owner_id"`
	CreatedAt   time.Time         `gorm:"type:datetime;not null" json:"created_at"`
	Owner       User              `gorm:"foreignKey:OwnerID;constraint:OnDelete:CASCADE" json:"-"`
	Memberships []GroupMembership `gorm:"foreignKey:GroupID" json:"-"`
	Problems    []ProblemShare    `gorm:"foreignKey:GroupID" json:"-"`
}

func (Group) TableName() string { return "groups" }

type GroupMembership struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	GroupID   int       `gorm:"index;not null" json:"group_id"`
	UserID    int       `gorm:"index;not null" json:"user_id"`
	Role      string    `gorm:"type:varchar(20);default:'member'" json:"role"`
	CreatedAt time.Time `gorm:"type:datetime;not null" json:"created_at"`
	Group     Group     `gorm:"foreignKey:GroupID;constraint:OnDelete:CASCADE" json:"-"`
	User      User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (GroupMembership) TableName() string { return "group_memberships" }

type ProblemShare struct {
	ID                int       `gorm:"primaryKey;autoIncrement" json:"id"`
	GroupID           int       `gorm:"index;not null" json:"group_id"`
	SharedByID        int       `gorm:"index;not null" json:"shared_by_id"`
	Platform          string    `gorm:"type:varchar(32);index;not null" json:"platform"`
	ProblemURL        string    `gorm:"type:text;not null" json:"problem_url"`
	PlatformProblemID *string   `gorm:"type:varchar(120);index" json:"platform_problem_id"`
	Title             string    `gorm:"type:varchar(255);index;not null" json:"title"`
	Contest           *string   `gorm:"type:varchar(255)" json:"contest"`
	Tags              *string   `gorm:"type:varchar(255)" json:"tags"`
	Difficulty        string    `gorm:"type:varchar(64);default:'Unknown'" json:"difficulty"`
	ThumbnailURL      *string   `gorm:"type:varchar(500)" json:"thumbnail_url"`
	SolvedByCount     *int      `gorm:"type:int" json:"solved_by_count"`
	ProblemSignature  string    `gorm:"type:varchar(255);index;not null" json:"problem_signature"`
	SharedAt          time.Time `gorm:"type:datetime;index;not null" json:"shared_at"`
	Group             Group     `gorm:"foreignKey:GroupID;constraint:OnDelete:CASCADE" json:"-"`
	SharedBy          User      `gorm:"foreignKey:SharedByID;constraint:OnDelete:CASCADE" json:"-"`
}

func (ProblemShare) TableName() string { return "problem_shares" }

type JoinRequest struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	GroupID   int       `gorm:"index;not null" json:"group_id"`
	UserID    int       `gorm:"index;not null" json:"user_id"`
	Status    string    `gorm:"type:varchar(20);default:'pending'" json:"status"`
	CreatedAt time.Time `gorm:"type:datetime;not null" json:"created_at"`
	Group     Group     `gorm:"foreignKey:GroupID;constraint:OnDelete:CASCADE" json:"-"`
	User      User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (JoinRequest) TableName() string { return "join_requests" }

type Challenge struct {
	ID           int                    `gorm:"primaryKey;autoIncrement" json:"id"`
	CreatedByID  int                    `gorm:"index;not null" json:"created_by_id"`
	Title        string                 `gorm:"type:varchar(120);not null" json:"title"`
	Platform     string                 `gorm:"type:varchar(32);default:'codeforces'" json:"platform"`
	NumProblems  int                    `gorm:"type:smallint;default:3" json:"num_problems"`
	MinRating    *int                   `gorm:"type:int" json:"min_rating"`
	MaxRating    *int                   `gorm:"type:int" json:"max_rating"`
	Tags         *string                `gorm:"type:varchar(500)" json:"tags"`
	Status       string                 `gorm:"type:varchar(20);default:'pending'" json:"status"`
	CreatedAt    time.Time              `gorm:"type:datetime;not null" json:"created_at"`
	StartedAt    *time.Time             `gorm:"type:datetime" json:"started_at"`
	CreatedBy    User                   `gorm:"foreignKey:CreatedByID;constraint:OnDelete:CASCADE" json:"-"`
	Participants []ChallengeParticipant `gorm:"foreignKey:ChallengeID" json:"-"`
	Problems     []ChallengeProblem     `gorm:"foreignKey:ChallengeID" json:"-"`
}

func (Challenge) TableName() string { return "challenges" }

type ChallengeParticipant struct {
	ID          int        `gorm:"primaryKey;autoIncrement" json:"id"`
	ChallengeID int        `gorm:"index;not null" json:"challenge_id"`
	UserID      int        `gorm:"index;not null" json:"user_id"`
	Status      string     `gorm:"type:varchar(20);default:'invited'" json:"status"`
	JoinedAt    *time.Time `gorm:"type:datetime" json:"joined_at"`
	Challenge   Challenge  `gorm:"foreignKey:ChallengeID;constraint:OnDelete:CASCADE" json:"-"`
	User        User       `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (ChallengeParticipant) TableName() string { return "challenge_participants" }

type ChallengeProblem struct {
	ID           int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ChallengeID  int       `gorm:"index;not null" json:"challenge_id"`
	ProblemURL   string    `gorm:"type:text;not null" json:"problem_url"`
	Title        string    `gorm:"type:varchar(255);not null" json:"title"`
	ContestID    *int      `gorm:"type:int" json:"contest_id"`
	ProblemIndex *string   `gorm:"type:varchar(10)" json:"problem_index"`
	Rating       *int      `gorm:"type:int" json:"rating"`
	Tags         *string   `gorm:"type:varchar(500)" json:"tags"`
	OrderIndex   int       `gorm:"type:smallint;default:0" json:"order_index"`
	Challenge    Challenge `gorm:"foreignKey:ChallengeID;constraint:OnDelete:CASCADE" json:"-"`
}

func (ChallengeProblem) TableName() string { return "challenge_problems" }
