from __future__ import annotations

from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.validation import (
    normalize_bio_text,
    normalize_optional_text,
    normalize_required_text,
    normalize_username,
    validate_problem_url,
    validate_profile_image_url,
)


def to_camel(field_name: str) -> str:
    parts = field_name.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class APIModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)


class UserSummary(APIModel):
    id: int
    email: EmailStr
    username: str
    display_name: str
    bio: str = ""
    favorite_topic: str | None = None
    favorite_platform: str | None = None
    avatar_url: str | None = None


class TokenResponse(APIModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSummary


class RegisterRequest(APIModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=24)
    display_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=1, max_length=128)
    favorite_topic: str | None = Field(default=None, max_length=120)
    favorite_platform: str | None = Field(default=None, max_length=120)

    @field_validator("username")
    @classmethod
    def normalize_username_value(cls, value: str) -> str:
        return normalize_username(value)

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        return normalize_required_text(value, field_name="Display name")

    @field_validator("favorite_topic")
    @classmethod
    def normalize_favorite_topic(cls, value: str | None) -> str | None:
        return normalize_optional_text(value, field_name="Favorite topic")

    @field_validator("favorite_platform")
    @classmethod
    def normalize_favorite_platform(cls, value: str | None) -> str | None:
        return normalize_optional_text(value, field_name="Favorite platform")


class LoginRequest(APIModel):
    identifier: str = Field(
        min_length=3,
        max_length=255,
        validation_alias=AliasChoices("identifier", "email"),
    )
    password: str = Field(min_length=1, max_length=128)

    @field_validator("identifier")
    @classmethod
    def normalize_identifier(cls, value: str) -> str:
        return normalize_required_text(value, field_name="Email or username")


class ProfileUpdateRequest(APIModel):
    display_name: str = Field(min_length=2, max_length=120)
    bio: str = Field(default="", max_length=255)
    favorite_topic: str | None = Field(default=None, max_length=120)
    favorite_platform: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=500)

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        return normalize_required_text(value, field_name="Display name")

    @field_validator("bio")
    @classmethod
    def normalize_bio(cls, value: str) -> str:
        return normalize_bio_text(value)

    @field_validator("favorite_topic")
    @classmethod
    def normalize_topic(cls, value: str | None) -> str | None:
        return normalize_optional_text(value, field_name="Favorite topic")

    @field_validator("favorite_platform")
    @classmethod
    def normalize_platform(cls, value: str | None) -> str | None:
        return normalize_optional_text(value, field_name="Favorite platform")

    @field_validator("avatar_url")
    @classmethod
    def normalize_avatar_url(cls, value: str | None) -> str | None:
        return validate_profile_image_url(value)


class FriendUser(APIModel):
    id: int
    username: str
    display_name: str
    avatar_url: str | None = None
    is_friend: bool
    friendship_status: str = "none"


class FriendLookupQuery(APIModel):
    username: str = Field(min_length=3, max_length=25)

    @field_validator("username")
    @classmethod
    def normalize_lookup_username(cls, value: str) -> str:
        return normalize_username(value, field_name="Username", allow_at_prefix=True)


class FriendLookupResponse(APIModel):
    user: FriendUser | None = None


class FriendSearchQuery(APIModel):
    q: str = Field(min_length=2, max_length=50)


class FriendRequest(APIModel):
    id: int
    from_user: FriendUser
    created_at: datetime


class GroupCreateRequest(APIModel):
    name: str = Field(min_length=2, max_length=120)
    member_ids: list[int] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return normalize_required_text(value, field_name="Group name")

    @field_validator("member_ids")
    @classmethod
    def normalize_member_ids(cls, value: list[int]) -> list[int]:
        deduplicated: list[int] = []
        seen: set[int] = set()
        for member_id in value:
            if member_id <= 0:
                raise ValueError("Member IDs must be positive integers.")
            if member_id not in seen:
                seen.add(member_id)
                deduplicated.append(member_id)
        return deduplicated


class GroupAddMembersRequest(APIModel):
    member_ids: list[int] = Field(min_length=1)

    @field_validator("member_ids")
    @classmethod
    def normalize_member_ids(cls, value: list[int]) -> list[int]:
        deduplicated: list[int] = []
        seen: set[int] = set()
        for member_id in value:
            if member_id <= 0:
                raise ValueError("Member IDs must be positive integers.")
            if member_id not in seen:
                seen.add(member_id)
                deduplicated.append(member_id)
        return deduplicated


class GroupMember(APIModel):
    id: int
    username: str


class GroupSummary(APIModel):
    id: int
    name: str
    member_count: int
    problem_count: int
    last_active_at: datetime | None
    members: list[str]
    member_details: list[GroupMember] = Field(default_factory=list)
    is_owner: bool = False


class ProblemCreateRequest(APIModel):
    url: str = Field(min_length=8, max_length=1000)

    @field_validator("url")
    @classmethod
    def normalize_url(cls, value: str) -> str:
        return validate_problem_url(value)


class ProblemSummary(APIModel):
    id: int
    title: str
    contest: str | None = None
    tags: str | None = None
    difficulty: str
    url: str
    platform: str
    shared_by: str
    thumbnail_url: str | None = None
    solved_by_count: int | None = None
    shared_at: datetime


class StatPoint(APIModel):
    label: str
    value: str
    change: str | None = None


class DistributionPoint(APIModel):
    name: str
    value: int


class PlatformPoint(APIModel):
    name: str
    problems: int


class DailyPoint(APIModel):
    day: str
    problems: int


class MonthlyPoint(APIModel):
    month: str
    problems: int


class MemberLeaderboardEntry(APIModel):
    name: str
    problems: int
    top_difficulty: str


class TopProblemEntry(APIModel):
    title: str
    contest: str | None = None
    shares: int
    difficulty: str


class GlobalStatsResponse(APIModel):
    groups_created: int
    problems_shared: int
    active_members: int


class PlatformDifficultyItem(APIModel):
    tier: str
    count: int
    percent: int


class PlatformDifficultyGroup(APIModel):
    platform: str
    items: list[PlatformDifficultyItem]


class AnalyticsResponse(APIModel):
    stats: list[StatPoint]
    difficulty_distribution: list[DistributionPoint]
    platform_difficulty: list[PlatformDifficultyGroup]
    platform_loyalty: list[PlatformPoint]
    weekly_activity: list[DailyPoint]
    monthly_trend: list[MonthlyPoint]
    member_leaderboard: list[MemberLeaderboardEntry]
    top_problems: list[TopProblemEntry]


class ChallengeCreateRequest(APIModel):
    title: str = Field(min_length=2, max_length=120)
    platform: str = Field(default="codeforces", max_length=32)
    num_problems: int = Field(default=3, ge=1, le=10)
    min_rating: int | None = Field(default=800, ge=0, le=3500)
    max_rating: int | None = Field(default=1600, ge=0, le=3500)
    tags: list[str] = Field(default_factory=list)
    invite_user_ids: list[int] = Field(min_length=1)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        return normalize_required_text(value, field_name="Challenge title")


class ChallengeProblemSummary(APIModel):
    id: int
    problem_url: str
    title: str
    contest_id: int | None = None
    problem_index: str | None = None
    rating: int | None = None
    tags: str | None = None
    order_index: int


class ChallengeParticipantSummary(APIModel):
    user_id: int
    username: str
    display_name: str
    avatar_url: str | None = None
    status: str


class ChallengeSummary(APIModel):
    id: int
    title: str
    platform: str
    num_problems: int
    min_rating: int | None = None
    max_rating: int | None = None
    tags: str | None = None
    status: str
    created_by: str
    created_by_id: int
    participants: list[ChallengeParticipantSummary]
    problems: list[ChallengeProblemSummary]
    created_at: datetime
    started_at: datetime | None = None
