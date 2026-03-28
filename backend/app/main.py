from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.bootstrap import run_startup_tasks
from app.config import get_settings
from app.db import engine, get_db
from app.deps import get_current_user
from app.http import install_security_middleware
from app.models import Challenge, ChallengeParticipant, ChallengeProblem, Friendship, Group, GroupMembership, ProblemShare, User
from app.schemas import (
    AnalyticsResponse,
    FriendLookupQuery,
    FriendLookupResponse,
    FriendRequest,
    FriendSearchQuery,
    FriendUser,
    GlobalStatsResponse,
    GoogleAuthRequest,
    GroupAddMembersRequest,
    GroupCreateRequest,
    GroupSummary,
    LoginRequest,
    ProblemCreateRequest,
    ProblemSummary,
    ProfileUpdateRequest,
    RegisterRequest,
    TokenResponse,
    UserSummary,
    ChallengeCreateRequest,
    ChallengeParticipantSummary,
    ChallengeProblemSummary,
    ChallengeSummary,
)
from app.security import create_access_token, hash_password, verify_password
from app.services.analytics import build_analytics, filter_problems_by_window
from app.services.auth import find_user_by_identifier
from app.services.metadata import PLATFORM_LABELS, normalize_difficulty_for_platform, resolve_problem
from app.services.rate_limit import get_auth_rate_limiter, get_friend_lookup_rate_limiter


AnalyticsWindow = Literal["7d", "30d", "90d", "all"]


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if settings.run_startup_tasks_on_app_start:
            run_startup_tasks()
        yield

    app = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
        docs_url="/docs" if settings.enable_docs else None,
        redoc_url="/redoc" if settings.enable_docs else None,
        openapi_url="/openapi.json" if settings.enable_docs else None,
    )
    install_security_middleware(app, environment=settings.environment)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        try:
            with engine.connect() as connection:
                connection.exec_driver_sql("SELECT 1")
        except SQLAlchemyError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable.") from exc

        return {"status": "ok", "database": "ok"}

    @app.get("/api/stats", response_model=GlobalStatsResponse)
    def get_global_stats(db: Session = Depends(get_db)) -> GlobalStatsResponse:
        groups_created = db.scalar(select(func.count(Group.id))) or 0
        problems_shared = db.scalar(select(func.count(ProblemShare.id))) or 0
        active_members = db.scalar(select(func.count(User.id))) or 0
        return GlobalStatsResponse(
            groups_created=groups_created,
            problems_shared=problems_shared,
            active_members=active_members,
        )

    @app.post("/api/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
    def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
        email_exists = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower()))
        if email_exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for that email.")

        username_exists = db.scalar(select(User).where(User.username == payload.username))
        if username_exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That username is already taken.")

        user = User(
            email=payload.email.lower(),
            username=payload.username,
            display_name=payload.display_name.strip(),
            bio="",
            favorite_topic=payload.favorite_topic,
            favorite_platform=payload.favorite_platform,
            avatar_url=f"https://api.dicebear.com/9.x/initials/svg?seed={payload.username}",
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        db.flush()

        personal_group = Group(name=f"{user.display_name}'s Squad", owner_id=user.id)
        db.add(personal_group)
        db.flush()
        db.add(GroupMembership(group_id=personal_group.id, user_id=user.id, role="owner"))
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with those credentials already exists.",
            ) from exc

        db.refresh(user)
        return _token_response_for_user(user)

    @app.post("/api/auth/login", response_model=TokenResponse)
    def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
        limiter = get_auth_rate_limiter()
        rate_limit_key = _build_auth_rate_limit_key(request, payload.identifier)
        rate_limit_decision = limiter.check(rate_limit_key)
        if not rate_limit_decision.allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please wait and try again.",
                headers={"Retry-After": str(rate_limit_decision.retry_after_seconds)},
            )

        user = find_user_by_identifier(db, payload.identifier)
        if user is None or not user.password_hash or not verify_password(payload.password, user.password_hash):
            limiter.record_failure(rate_limit_key)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email, username, or password.",
            )

        limiter.clear(rate_limit_key)
        return _token_response_for_user(user)

    @app.post("/api/auth/google", response_model=TokenResponse)
    async def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)) -> TokenResponse:
        from app.services.google_oauth import exchange_code_for_user

        try:
            google_user = await exchange_code_for_user(payload.code)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google authentication failed. Please try again.",
            )

        user = db.scalar(select(User).where(User.google_id == google_user.google_id))
        if user is not None:
            if user.avatar_url and "dicebear" in user.avatar_url and google_user.picture:
                user.avatar_url = google_user.picture
                db.commit()
                db.refresh(user)
            return _token_response_for_user(user)

        user = db.scalar(select(User).where(func.lower(User.email) == google_user.email.lower()))
        if user is not None:
            user.google_id = google_user.google_id
            user.auth_provider = "google" if not user.password_hash else "both"
            if user.avatar_url and "dicebear" in user.avatar_url and google_user.picture:
                user.avatar_url = google_user.picture
            db.commit()
            db.refresh(user)
            return _token_response_for_user(user)

        base_username = google_user.email.split("@")[0].lower()[:24]
        username = base_username
        counter = 1
        while db.scalar(select(User).where(User.username == username)):
            suffix = str(counter)
            username = base_username[: 24 - len(suffix)] + suffix
            counter += 1

        user = User(
            email=google_user.email.lower(),
            username=username,
            display_name=google_user.name,
            bio="",
            avatar_url=google_user.picture or f"https://api.dicebear.com/9.x/initials/svg?seed={username}",
            password_hash=None,
            google_id=google_user.google_id,
            auth_provider="google",
        )
        db.add(user)
        db.flush()

        personal_group = Group(name=f"{user.display_name}'s Squad", owner_id=user.id)
        db.add(personal_group)
        db.flush()
        db.add(GroupMembership(group_id=personal_group.id, user_id=user.id, role="owner"))
        db.commit()
        db.refresh(user)
        return _token_response_for_user(user)

    @app.get("/api/auth/me", response_model=UserSummary)
    def me(current_user: User = Depends(get_current_user)) -> UserSummary:
        return _serialize_user(current_user)

    @app.get("/api/profile", response_model=UserSummary)
    def get_profile(current_user: User = Depends(get_current_user)) -> UserSummary:
        return _serialize_user(current_user)

    @app.patch("/api/profile", response_model=UserSummary)
    def update_profile(
        payload: ProfileUpdateRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> UserSummary:
        current_user.display_name = payload.display_name
        current_user.bio = payload.bio
        current_user.favorite_topic = payload.favorite_topic
        current_user.favorite_platform = payload.favorite_platform
        current_user.avatar_url = payload.avatar_url
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return _serialize_user(current_user)

    @app.get("/api/friends/lookup", response_model=FriendLookupResponse)
    def lookup_friend_by_username(
        request: Request,
        params: FriendLookupQuery = Depends(),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> FriendLookupResponse:
        limiter = get_friend_lookup_rate_limiter()
        rate_limit_key = _build_friend_lookup_rate_limit_key(request, current_user.id)
        rate_limit_decision = limiter.check(rate_limit_key)
        if not rate_limit_decision.allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many username lookups. Please wait and try again.",
                headers={"Retry-After": str(rate_limit_decision.retry_after_seconds)},
            )

        limiter.record_attempt(rate_limit_key)
        if params.username == current_user.username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot add yourself as a friend.")

        friend_ids = _accepted_friend_id_set(db, current_user.id)
        pending_outgoing = _pending_outgoing_set(db, current_user.id)
        pending_incoming = _pending_incoming_set(db, current_user.id)
        user = db.scalar(select(User).where(User.id != current_user.id, User.username == params.username))
        if user is None:
            return FriendLookupResponse(user=None)

        return FriendLookupResponse(
            user=_serialize_friend_user(
                user,
                friend_ids=friend_ids,
                pending_outgoing=pending_outgoing,
                pending_incoming=pending_incoming,
            )
        )

    @app.get("/api/friends/search", response_model=list[FriendUser])
    def search_users(
        request: Request,
        params: FriendSearchQuery = Depends(),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[FriendUser]:
        limiter = get_friend_lookup_rate_limiter()
        rate_limit_key = _build_friend_lookup_rate_limit_key(request, current_user.id)
        rate_limit_decision = limiter.check(rate_limit_key)
        if not rate_limit_decision.allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many search requests. Please wait and try again.",
                headers={"Retry-After": str(rate_limit_decision.retry_after_seconds)},
            )
        limiter.record_attempt(rate_limit_key)

        query = params.q.strip().lstrip("@")
        pattern = f"%{query}%"

        users = db.scalars(
            select(User)
            .where(
                User.id != current_user.id,
                or_(
                    User.username.ilike(pattern),
                    User.display_name.ilike(pattern),
                    User.email.ilike(pattern),
                ),
            )
            .order_by(User.display_name.asc())
            .limit(10)
        ).all()

        if not users:
            return []

        friend_ids = _accepted_friend_id_set(db, current_user.id)
        pending_outgoing = _pending_outgoing_set(db, current_user.id)
        pending_incoming = _pending_incoming_set(db, current_user.id)

        return [
            _serialize_friend_user(
                user,
                friend_ids=friend_ids,
                pending_outgoing=pending_outgoing,
                pending_incoming=pending_incoming,
            )
            for user in users
        ]

    @app.get("/api/friends/list", response_model=list[FriendUser])
    def list_friends(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[FriendUser]:
        friend_ids = _accepted_friend_id_set(db, current_user.id)
        if not friend_ids:
            return []
        users = db.scalars(select(User).where(User.id.in_(friend_ids)).order_by(User.display_name.asc())).all()
        return [_serialize_friend_user(user, friend_ids=friend_ids) for user in users]

    @app.post("/api/friends/{friend_id}", response_model=FriendUser)
    def add_friend(
        friend_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> FriendUser:
        if friend_id == current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot add yourself as a friend.")

        friend = db.scalar(select(User).where(User.id == friend_id))
        if friend is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        existing = db.scalar(
            select(Friendship).where(Friendship.user_id == current_user.id, Friendship.friend_id == friend_id)
        )
        if existing is not None:
            friendship_status = "accepted" if existing.status == "accepted" else "pending_outgoing"
            return FriendUser(
                id=friend.id,
                username=friend.username,
                display_name=friend.display_name,
                avatar_url=friend.avatar_url,
                is_friend=existing.status == "accepted",
                friendship_status=friendship_status,
            )

        reverse = db.scalar(
            select(Friendship).where(Friendship.user_id == friend_id, Friendship.friend_id == current_user.id)
        )
        if reverse is not None and reverse.status == "pending":
            reverse.status = "accepted"
            db.add(Friendship(user_id=current_user.id, friend_id=friend_id, status="accepted"))
            db.commit()
            return FriendUser(
                id=friend.id,
                username=friend.username,
                display_name=friend.display_name,
                avatar_url=friend.avatar_url,
                is_friend=True,
                friendship_status="accepted",
            )

        db.add(Friendship(user_id=current_user.id, friend_id=friend_id, status="pending"))
        db.commit()

        return FriendUser(
            id=friend.id,
            username=friend.username,
            display_name=friend.display_name,
            avatar_url=friend.avatar_url,
            is_friend=False,
            friendship_status="pending_outgoing",
        )

    @app.delete("/api/friends/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
    def remove_friend(
        friend_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> None:
        friendship = db.scalar(
            select(Friendship).where(Friendship.user_id == current_user.id, Friendship.friend_id == friend_id)
        )
        if friendship is not None:
            db.delete(friendship)
        reverse = db.scalar(
            select(Friendship).where(Friendship.user_id == friend_id, Friendship.friend_id == current_user.id)
        )
        if reverse is not None:
            db.delete(reverse)

        db.execute(
            delete(GroupMembership)
            .where(GroupMembership.user_id == friend_id)
            .where(GroupMembership.group_id.in_(select(Group.id).where(Group.owner_id == current_user.id)))
        )
        db.execute(
            delete(GroupMembership)
            .where(GroupMembership.user_id == current_user.id)
            .where(GroupMembership.group_id.in_(select(Group.id).where(Group.owner_id == friend_id)))
        )
        db.commit()

    @app.get("/api/friends/requests", response_model=list[FriendRequest])
    def list_friend_requests(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[FriendRequest]:
        pending = db.scalars(
            select(Friendship)
            .where(Friendship.friend_id == current_user.id, Friendship.status == "pending")
            .options(joinedload(Friendship.user))
            .order_by(Friendship.created_at.desc())
        ).all()
        return [
            FriendRequest(
                id=req.id,
                from_user=FriendUser(
                    id=req.user.id,
                    username=req.user.username,
                    display_name=req.user.display_name,
                    avatar_url=req.user.avatar_url,
                    is_friend=False,
                    friendship_status="pending_incoming",
                ),
                created_at=_ensure_aware(req.created_at),
            )
            for req in pending
        ]

    @app.post("/api/friends/requests/{request_id}/accept", response_model=FriendUser)
    def accept_friend_request(
        request_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> FriendUser:
        req = db.scalar(
            select(Friendship)
            .where(Friendship.id == request_id, Friendship.friend_id == current_user.id, Friendship.status == "pending")
            .options(joinedload(Friendship.user))
        )
        if req is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found.")
        req.status = "accepted"
        existing_reverse = db.scalar(
            select(Friendship).where(Friendship.user_id == current_user.id, Friendship.friend_id == req.user_id)
        )
        if existing_reverse is None:
            db.add(Friendship(user_id=current_user.id, friend_id=req.user_id, status="accepted"))
        else:
            existing_reverse.status = "accepted"
        db.commit()
        return FriendUser(
            id=req.user.id,
            username=req.user.username,
            display_name=req.user.display_name,
            avatar_url=req.user.avatar_url,
            is_friend=True,
            friendship_status="accepted",
        )

    @app.post("/api/friends/requests/{request_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
    def reject_friend_request(
        request_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> None:
        req = db.scalar(
            select(Friendship).where(
                Friendship.id == request_id,
                Friendship.friend_id == current_user.id,
                Friendship.status == "pending",
            )
        )
        if req is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found.")
        db.delete(req)
        db.commit()

    @app.get("/api/groups", response_model=list[GroupSummary])
    def list_groups(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[GroupSummary]:
        groups = db.scalars(
            select(Group)
            .join(GroupMembership, GroupMembership.group_id == Group.id)
            .where(GroupMembership.user_id == current_user.id)
            .options(
                joinedload(Group.memberships).joinedload(GroupMembership.user),
                joinedload(Group.problems),
            )
            .order_by(Group.created_at.asc())
        ).unique().all()

        return [_serialize_group(group, current_user.id) for group in groups]

    @app.post("/api/groups", response_model=GroupSummary, status_code=status.HTTP_201_CREATED)
    def create_group(
        payload: GroupCreateRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> GroupSummary:
        group = Group(name=payload.name, owner_id=current_user.id)
        db.add(group)
        db.flush()
        db.add(GroupMembership(group_id=group.id, user_id=current_user.id, role="owner"))

        member_ids = {member_id for member_id in payload.member_ids if member_id != current_user.id}
        if member_ids:
            users = db.scalars(select(User).where(User.id.in_(member_ids))).all()
            valid_ids = {user.id for user in users}
            for member_id in valid_ids:
                db.add(GroupMembership(group_id=group.id, user_id=member_id, role="member"))

        db.commit()
        db.refresh(group)
        group = db.scalar(
            select(Group)
            .where(Group.id == group.id)
            .options(joinedload(Group.memberships).joinedload(GroupMembership.user), joinedload(Group.problems))
        )
        return _serialize_group(group, current_user.id)

    @app.delete("/api/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_group(
        group_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> None:
        group = db.scalar(select(Group).where(Group.id == group_id, Group.owner_id == current_user.id))
        if group is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found or you don't have permission.",
            )
        db.delete(group)
        db.commit()

    @app.post("/api/groups/{group_id}/members", response_model=GroupSummary)
    def add_group_members(
        group_id: int,
        payload: GroupAddMembersRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> GroupSummary:
        group = _get_accessible_group(db, group_id, current_user.id)

        existing_member_ids = {membership.user_id for membership in group.memberships}
        new_member_ids = {member_id for member_id in payload.member_ids if member_id not in existing_member_ids}

        if new_member_ids:
            users = db.scalars(select(User).where(User.id.in_(new_member_ids))).all()
            valid_ids = {user.id for user in users}
            for member_id in valid_ids:
                db.add(GroupMembership(group_id=group.id, user_id=member_id, role="member"))
            db.commit()
            db.refresh(group)
            group = db.scalar(
                select(Group)
                .where(Group.id == group.id)
                .options(joinedload(Group.memberships).joinedload(GroupMembership.user), joinedload(Group.problems))
            )

        return _serialize_group(group, current_user.id)

    @app.delete("/api/groups/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
    def remove_group_member(
        group_id: int,
        user_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> None:
        group = _get_accessible_group(db, group_id, current_user.id)

        if user_id != current_user.id and group.owner_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to remove this member.")

        membership = db.scalar(
            select(GroupMembership).where(GroupMembership.group_id == group.id, GroupMembership.user_id == user_id)
        )
        if membership is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in group.")

        if user_id == group.owner_id:
            next_member = db.scalar(
                select(GroupMembership)
                .where(GroupMembership.group_id == group.id, GroupMembership.user_id != user_id)
                .order_by(GroupMembership.created_at.asc())
            )

            if next_member:
                group.owner_id = next_member.user_id
                next_member.role = "owner"
                db.delete(membership)
            else:
                db.delete(group)
        else:
            db.delete(membership)

        db.commit()

    @app.get("/api/groups/{group_id}/problems", response_model=list[ProblemSummary])
    def list_group_problems(
        group_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[ProblemSummary]:
        group = _get_accessible_group(db, group_id, current_user.id)
        problems = db.scalars(
            select(ProblemShare)
            .where(ProblemShare.group_id == group.id)
            .options(joinedload(ProblemShare.shared_by))
            .order_by(ProblemShare.shared_at.desc())
        ).all()
        return [_serialize_problem(problem) for problem in problems]

    @app.post("/api/groups/{group_id}/problems", response_model=ProblemSummary, status_code=status.HTTP_201_CREATED)
    async def add_problem(
        group_id: int,
        payload: ProblemCreateRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> ProblemSummary:
        group = _get_accessible_group(db, group_id, current_user.id)
        resolved = await resolve_problem(payload.url, db=db)
        problem = ProblemShare(
            group_id=group.id,
            shared_by_id=current_user.id,
            platform=resolved.platform,
            problem_url=resolved.problem_url,
            platform_problem_id=resolved.platform_problem_id,
            title=resolved.title,
            contest=resolved.contest,
            tags=resolved.tags,
            difficulty=resolved.difficulty,
            thumbnail_url=resolved.thumbnail_url,
            solved_by_count=resolved.solved_by_count,
            problem_signature=resolved.signature,
        )
        db.add(problem)
        db.commit()
        db.refresh(problem)
        problem = db.scalar(select(ProblemShare).where(ProblemShare.id == problem.id).options(joinedload(ProblemShare.shared_by)))
        return _serialize_problem(problem)

    @app.delete("/api/groups/{group_id}/problems/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
    def remove_group_problem(
        group_id: int,
        problem_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> None:
        group = _get_accessible_group(db, group_id, current_user.id)

        problem = db.scalar(select(ProblemShare).where(ProblemShare.id == problem_id, ProblemShare.group_id == group.id))
        if problem is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found in group.")

        if problem.shared_by_id != current_user.id and group.owner_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to remove this problem.")

        db.delete(problem)
        db.commit()

    @app.get("/api/problems/feed", response_model=list[ProblemSummary])
    def get_problems_feed(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[ProblemSummary]:
        problems = db.scalars(
            select(ProblemShare)
            .join(Group, Group.id == ProblemShare.group_id)
            .join(GroupMembership, GroupMembership.group_id == Group.id)
            .where(GroupMembership.user_id == current_user.id)
            .options(joinedload(ProblemShare.shared_by))
            .order_by(ProblemShare.shared_at.desc())
            .limit(50)
        ).all()
        return [_serialize_problem(problem) for problem in problems]

    @app.get("/api/groups/{group_id}/analytics", response_model=AnalyticsResponse)
    def group_analytics(
        group_id: int,
        window: AnalyticsWindow = Query(default="30d"),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> AnalyticsResponse:
        group = _get_accessible_group(db, group_id, current_user.id)
        problems = db.scalars(
            select(ProblemShare)
            .where(ProblemShare.group_id == group.id)
            .options(joinedload(ProblemShare.shared_by))
            .order_by(ProblemShare.shared_at.desc())
        ).all()
        return build_analytics(filter_problems_by_window(problems, window))

    @app.get("/api/analytics/me", response_model=AnalyticsResponse)
    def personal_analytics(
        window: AnalyticsWindow = Query(default="30d"),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> AnalyticsResponse:
        problems = db.scalars(
            select(ProblemShare)
            .where(ProblemShare.shared_by_id == current_user.id)
            .options(joinedload(ProblemShare.shared_by))
            .order_by(ProblemShare.shared_at.desc())
        ).all()
        return build_analytics(filter_problems_by_window(problems, window))

    # ── Challenges ───────────────────────────────────────────────────

    @app.post("/api/challenges", response_model=ChallengeSummary, status_code=status.HTTP_201_CREATED)
    async def create_challenge(
        payload: ChallengeCreateRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> ChallengeSummary:
        from app.services.codeforces import fetch_cf_problems, pick_random_problems

        challenge = Challenge(
            created_by_id=current_user.id,
            title=payload.title,
            platform=payload.platform,
            num_problems=payload.num_problems,
            min_rating=payload.min_rating,
            max_rating=payload.max_rating,
            tags=",".join(payload.tags) if payload.tags else None,
            status="pending",
        )
        db.add(challenge)
        db.flush()

        db.add(ChallengeParticipant(
            challenge_id=challenge.id, user_id=current_user.id, status="accepted",
            joined_at=datetime.now(timezone.utc),
        ))
        for uid in payload.invite_user_ids:
            if uid == current_user.id:
                continue
            db.add(ChallengeParticipant(challenge_id=challenge.id, user_id=uid, status="invited"))

        cf_problems = await fetch_cf_problems(
            tags=payload.tags or None,
            min_rating=payload.min_rating,
            max_rating=payload.max_rating,
        )
        selected = pick_random_problems(cf_problems, payload.num_problems)
        for idx, prob in enumerate(selected):
            db.add(ChallengeProblem(
                challenge_id=challenge.id,
                problem_url=prob.url,
                title=prob.name,
                contest_id=prob.contest_id,
                problem_index=prob.index,
                rating=prob.rating,
                tags=",".join(prob.tags) if prob.tags else None,
                order_index=idx,
            ))

        db.commit()
        db.refresh(challenge)
        challenge = db.scalar(
            select(Challenge).where(Challenge.id == challenge.id)
            .options(
                joinedload(Challenge.participants).joinedload(ChallengeParticipant.user),
                joinedload(Challenge.problems),
                joinedload(Challenge.created_by),
            )
        )
        return _serialize_challenge(challenge)

    @app.get("/api/challenges", response_model=list[ChallengeSummary])
    def list_challenges(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[ChallengeSummary]:
        challenges = db.scalars(
            select(Challenge)
            .join(ChallengeParticipant, ChallengeParticipant.challenge_id == Challenge.id)
            .where(ChallengeParticipant.user_id == current_user.id)
            .options(
                joinedload(Challenge.participants).joinedload(ChallengeParticipant.user),
                joinedload(Challenge.problems),
                joinedload(Challenge.created_by),
            )
            .order_by(Challenge.created_at.desc())
        ).unique().all()
        return [_serialize_challenge(c) for c in challenges]

    @app.get("/api/challenges/{challenge_id}", response_model=ChallengeSummary)
    def get_challenge(
        challenge_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> ChallengeSummary:
        challenge = db.scalar(
            select(Challenge).where(Challenge.id == challenge_id)
            .options(
                joinedload(Challenge.participants).joinedload(ChallengeParticipant.user),
                joinedload(Challenge.problems),
                joinedload(Challenge.created_by),
            )
        )
        if challenge is None:
            raise HTTPException(status_code=404, detail="Challenge not found.")
        participant = next((p for p in challenge.participants if p.user_id == current_user.id), None)
        if participant is None:
            raise HTTPException(status_code=404, detail="Challenge not found.")
        return _serialize_challenge(challenge)

    @app.post("/api/challenges/{challenge_id}/accept", response_model=ChallengeSummary)
    def accept_challenge(
        challenge_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> ChallengeSummary:
        challenge = db.scalar(
            select(Challenge).where(Challenge.id == challenge_id)
            .options(
                joinedload(Challenge.participants).joinedload(ChallengeParticipant.user),
                joinedload(Challenge.problems),
                joinedload(Challenge.created_by),
            )
        )
        if challenge is None:
            raise HTTPException(status_code=404, detail="Challenge not found.")
        participant = next((p for p in challenge.participants if p.user_id == current_user.id), None)
        if participant is None:
            raise HTTPException(status_code=404, detail="Challenge not found.")
        if participant.status != "invited":
            raise HTTPException(status_code=400, detail="Already responded.")
        participant.status = "accepted"
        participant.joined_at = datetime.now(timezone.utc)

        all_accepted = all(p.status == "accepted" for p in challenge.participants)
        if all_accepted and challenge.status == "pending":
            challenge.status = "active"
            challenge.started_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(challenge)
        return _serialize_challenge(challenge)

    @app.post("/api/challenges/{challenge_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
    def decline_challenge(
        challenge_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> None:
        participant = db.scalar(
            select(ChallengeParticipant)
            .where(ChallengeParticipant.challenge_id == challenge_id, ChallengeParticipant.user_id == current_user.id)
        )
        if participant is None:
            raise HTTPException(status_code=404, detail="Challenge not found.")
        if participant.status != "invited":
            raise HTTPException(status_code=400, detail="Already responded.")
        participant.status = "declined"
        db.commit()

    @app.post("/api/challenges/{challenge_id}/start", response_model=ChallengeSummary)
    def start_challenge(
        challenge_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> ChallengeSummary:
        challenge = db.scalar(
            select(Challenge).where(Challenge.id == challenge_id)
            .options(
                joinedload(Challenge.participants).joinedload(ChallengeParticipant.user),
                joinedload(Challenge.problems),
                joinedload(Challenge.created_by),
            )
        )
        if challenge is None or challenge.created_by_id != current_user.id:
            raise HTTPException(status_code=404, detail="Challenge not found.")
        if challenge.status != "pending":
            raise HTTPException(status_code=400, detail="Challenge is not pending.")
        has_declined = any(p.status == "declined" for p in challenge.participants)
        if has_declined:
            raise HTTPException(status_code=400, detail="Some participants have declined.")
        challenge.status = "active"
        challenge.started_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(challenge)
        return _serialize_challenge(challenge)

    return app


app = create_app()


def _serialize_user(user: User) -> UserSummary:
    return UserSummary(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        bio=user.bio or "",
        favorite_topic=user.favorite_topic,
        favorite_platform=user.favorite_platform,
        avatar_url=user.avatar_url,
    )


def _token_response_for_user(user: User) -> TokenResponse:
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=_serialize_user(user))


def _serialize_friend_user(
    user: User,
    *,
    friend_ids: set[int],
    pending_outgoing: set[int] | None = None,
    pending_incoming: set[int] | None = None,
) -> FriendUser:
    outgoing_ids = pending_outgoing or set()
    incoming_ids = pending_incoming or set()

    friendship_status = "none"
    if user.id in friend_ids:
        friendship_status = "accepted"
    elif user.id in outgoing_ids:
        friendship_status = "pending_outgoing"
    elif user.id in incoming_ids:
        friendship_status = "pending_incoming"

    return FriendUser(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        is_friend=user.id in friend_ids,
        friendship_status=friendship_status,
    )


def _accepted_friend_id_set(db: Session, user_id: int) -> set[int]:
    rows = db.scalars(
        select(Friendship.friend_id).where(Friendship.user_id == user_id, Friendship.status == "accepted")
    ).all()
    return set(rows)


def _pending_outgoing_set(db: Session, user_id: int) -> set[int]:
    rows = db.scalars(
        select(Friendship.friend_id).where(Friendship.user_id == user_id, Friendship.status == "pending")
    ).all()
    return set(rows)


def _pending_incoming_set(db: Session, user_id: int) -> set[int]:
    rows = db.scalars(
        select(Friendship.user_id).where(Friendship.friend_id == user_id, Friendship.status == "pending")
    ).all()
    return set(rows)


def _serialize_group(group: Group, current_user_id: int) -> GroupSummary:
    last_active_at = None
    if group.problems:
        last_active_at = max(problem.shared_at for problem in group.problems)
    return GroupSummary(
        id=group.id,
        name=group.name,
        member_count=len(group.memberships),
        problem_count=len(group.problems),
        last_active_at=last_active_at,
        members=[membership.user.username for membership in group.memberships],
        member_details=[{"id": membership.user.id, "username": membership.user.username} for membership in group.memberships],
        is_owner=group.owner_id == current_user_id,
    )


def _serialize_problem(problem: ProblemShare) -> ProblemSummary:
    return ProblemSummary(
        id=problem.id,
        title=problem.title,
        contest=problem.contest,
        tags=problem.tags,
        difficulty=normalize_difficulty_for_platform(
            problem.platform, problem.difficulty or "Unknown", problem.platform_problem_id,
        ),
        url=problem.problem_url,
        platform=PLATFORM_LABELS.get(problem.platform, problem.platform.title()),
        shared_by=problem.shared_by.username,
        thumbnail_url=problem.thumbnail_url,
        solved_by_count=problem.solved_by_count,
        shared_at=_ensure_aware(problem.shared_at),
    )


def _get_accessible_group(db: Session, group_id: int, user_id: int) -> Group:
    group = db.scalar(
        select(Group)
        .join(GroupMembership, GroupMembership.group_id == Group.id)
        .where(Group.id == group_id, GroupMembership.user_id == user_id)
        .options(joinedload(Group.memberships).joinedload(GroupMembership.user), joinedload(Group.problems))
    )
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")
    return group


def _ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)


def _serialize_challenge(challenge: Challenge) -> ChallengeSummary:
    return ChallengeSummary(
        id=challenge.id,
        title=challenge.title,
        platform=challenge.platform,
        num_problems=challenge.num_problems,
        min_rating=challenge.min_rating,
        max_rating=challenge.max_rating,
        tags=challenge.tags,
        status=challenge.status,
        created_by=challenge.created_by.username,
        created_by_id=challenge.created_by_id,
        participants=[
            ChallengeParticipantSummary(
                user_id=p.user.id,
                username=p.user.username,
                display_name=p.user.display_name,
                avatar_url=p.user.avatar_url,
                status=p.status,
            )
            for p in challenge.participants
        ],
        problems=[
            ChallengeProblemSummary(
                id=prob.id,
                problem_url=prob.problem_url,
                title=prob.title,
                contest_id=prob.contest_id,
                problem_index=prob.problem_index,
                rating=prob.rating,
                tags=prob.tags,
                order_index=prob.order_index,
            )
            for prob in sorted(challenge.problems, key=lambda x: x.order_index)
        ],
        created_at=_ensure_aware(challenge.created_at),
        started_at=_ensure_aware(challenge.started_at) if challenge.started_at else None,
    )


def _build_auth_rate_limit_key(request: Request, identifier: str) -> str:
    client_host = request.client.host if request.client is not None else "unknown"
    return f"{client_host}:{identifier.strip().lower()}"


def _build_friend_lookup_rate_limit_key(request: Request, user_id: int) -> str:
    client_host = request.client.host if request.client is not None else "unknown"
    return f"{user_id}:{client_host}"
