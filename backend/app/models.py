from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, Integer, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    bio: Mapped[str] = mapped_column(String(255), default="")
    favorite_topic: Mapped[str | None] = mapped_column(String(120), nullable=True)
    favorite_platform: Mapped[str | None] = mapped_column(String(120), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    auth_provider: Mapped[str] = mapped_column(String(32), default="local")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owned_groups: Mapped[list[Group]] = relationship("Group", back_populates="owner")
    memberships: Mapped[list[GroupMembership]] = relationship("GroupMembership", back_populates="user")
    shared_problems: Mapped[list[ProblemShare]] = relationship("ProblemShare", back_populates="shared_by")
    friends: Mapped[list[Friendship]] = relationship(
        "Friendship",
        foreign_keys="Friendship.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (UniqueConstraint("user_id", "friend_id", name="uq_friendship_pair"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    friend_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship("User", foreign_keys=[user_id], back_populates="friends")
    friend: Mapped[User] = relationship("User", foreign_keys=[friend_id])


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped[User] = relationship("User", back_populates="owned_groups")
    memberships: Mapped[list[GroupMembership]] = relationship(
        "GroupMembership", back_populates="group", cascade="all, delete-orphan"
    )
    problems: Mapped[list[ProblemShare]] = relationship(
        "ProblemShare", back_populates="group", cascade="all, delete-orphan"
    )


class GroupMembership(Base):
    __tablename__ = "group_memberships"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_membership"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20), default="member")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    group: Mapped[Group] = relationship("Group", back_populates="memberships")
    user: Mapped[User] = relationship("User", back_populates="memberships")


class ProblemShare(Base):
    __tablename__ = "problem_shares"
    __table_args__ = (
        Index("ix_problem_shares_group_shared_at", "group_id", "shared_at"),
        Index("ix_problem_shares_shared_by_shared_at", "shared_by_id", "shared_at"),
        Index("ix_problem_shares_group_signature", "group_id", "problem_signature"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    shared_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    platform: Mapped[str] = mapped_column(String(32), index=True)
    problem_url: Mapped[str] = mapped_column(Text)
    platform_problem_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    contest: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tags: Mapped[str | None] = mapped_column(String(255), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(64), default="Unknown")
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    solved_by_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    problem_signature: Mapped[str] = mapped_column(String(255), index=True)
    shared_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    group: Mapped[Group] = relationship("Group", back_populates="problems")
    shared_by: Mapped[User] = relationship("User", back_populates="shared_problems")


class JoinRequest(Base):
    __tablename__ = "join_requests"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_join_request"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    group: Mapped[Group] = relationship("Group")
    user: Mapped[User] = relationship("User")


class Challenge(Base):
    __tablename__ = "challenges"
    __table_args__ = (
        Index("ix_challenges_created_by_status", "created_by_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    platform: Mapped[str] = mapped_column(String(32), default="codeforces")
    num_problems: Mapped[int] = mapped_column(SmallInteger, default=3)
    min_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tags: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by: Mapped[User] = relationship("User")
    participants: Mapped[list[ChallengeParticipant]] = relationship(
        "ChallengeParticipant", back_populates="challenge", cascade="all, delete-orphan",
    )
    problems: Mapped[list[ChallengeProblem]] = relationship(
        "ChallengeProblem", back_populates="challenge", cascade="all, delete-orphan",
    )


class ChallengeParticipant(Base):
    __tablename__ = "challenge_participants"
    __table_args__ = (
        UniqueConstraint("challenge_id", "user_id", name="uq_challenge_participant"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    challenge_id: Mapped[int] = mapped_column(ForeignKey("challenges.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="invited")
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    challenge: Mapped[Challenge] = relationship("Challenge", back_populates="participants")
    user: Mapped[User] = relationship("User")


class ChallengeProblem(Base):
    __tablename__ = "challenge_problems"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    challenge_id: Mapped[int] = mapped_column(ForeignKey("challenges.id", ondelete="CASCADE"), index=True)
    problem_url: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(String(255))
    contest_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    problem_index: Mapped[str | None] = mapped_column(String(10), nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tags: Mapped[str | None] = mapped_column(String(500), nullable=True)
    order_index: Mapped[int] = mapped_column(SmallInteger, default=0)

    challenge: Mapped[Challenge] = relationship("Challenge", back_populates="problems")
