"""SQLAdmin configuration — admin panel for TrieQuest data."""

from __future__ import annotations

from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request

from app.config import get_settings
from app.models import (
    Challenge,
    ChallengeParticipant,
    ChallengeProblem,
    Friendship,
    Group,
    GroupMembership,
    JoinRequest,
    ProblemShare,
    User,
)
from app.security import verify_password

ADMIN_EMAILS = {"officialasishkumar@gmail.com"}


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        email = form.get("username", "")
        password = form.get("password", "")

        if not email or not password:
            return False

        from app.db import SessionLocal
        from sqlalchemy import func, select

        with SessionLocal() as db:
            user = db.scalar(select(User).where(func.lower(User.email) == str(email).lower()))
            if not user or not user.password_hash:
                return False
            if user.email.lower() not in ADMIN_EMAILS:
                return False
            if not verify_password(str(password), user.password_hash):
                return False

        request.session.update({"admin_email": user.email})
        return True

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        email = request.session.get("admin_email")
        if not email:
            return False
        return email.lower() in ADMIN_EMAILS


class UserAdmin(ModelView, model=User):
    column_list = [
        User.id,
        User.email,
        User.username,
        User.display_name,
        User.auth_provider,
        User.created_at,
    ]
    column_searchable_list = [User.email, User.username, User.display_name]
    column_sortable_list = [User.id, User.email, User.username, User.created_at]
    column_default_sort = ("created_at", True)
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"
    can_delete = False
    column_details_exclude_list = [User.password_hash]


class FriendshipAdmin(ModelView, model=Friendship):
    column_list = [Friendship.id, Friendship.user_id, Friendship.friend_id, Friendship.status, Friendship.created_at]
    column_sortable_list = [Friendship.id, Friendship.created_at, Friendship.status]
    column_default_sort = ("created_at", True)
    name = "Friendship"
    name_plural = "Friendships"
    icon = "fa-solid fa-user-group"
    can_create = False
    can_delete = False


class GroupAdmin(ModelView, model=Group):
    column_list = [Group.id, Group.name, Group.owner_id, Group.created_at]
    column_searchable_list = [Group.name]
    column_sortable_list = [Group.id, Group.name, Group.created_at]
    column_default_sort = ("created_at", True)
    name = "Group"
    name_plural = "Groups"
    icon = "fa-solid fa-people-group"
    can_delete = False


class GroupMembershipAdmin(ModelView, model=GroupMembership):
    column_list = [GroupMembership.id, GroupMembership.group_id, GroupMembership.user_id, GroupMembership.role, GroupMembership.created_at]
    column_sortable_list = [GroupMembership.id, GroupMembership.created_at]
    column_default_sort = ("created_at", True)
    name = "Group Membership"
    name_plural = "Group Memberships"
    icon = "fa-solid fa-id-badge"
    can_create = False
    can_delete = False


class ProblemShareAdmin(ModelView, model=ProblemShare):
    column_list = [
        ProblemShare.id,
        ProblemShare.title,
        ProblemShare.platform,
        ProblemShare.difficulty,
        ProblemShare.shared_by_id,
        ProblemShare.group_id,
        ProblemShare.shared_at,
    ]
    column_searchable_list = [ProblemShare.title, ProblemShare.platform]
    column_sortable_list = [ProblemShare.id, ProblemShare.title, ProblemShare.platform, ProblemShare.shared_at]
    column_default_sort = ("shared_at", True)
    name = "Problem Share"
    name_plural = "Problem Shares"
    icon = "fa-solid fa-share-nodes"
    can_delete = False


class JoinRequestAdmin(ModelView, model=JoinRequest):
    column_list = [JoinRequest.id, JoinRequest.group_id, JoinRequest.user_id, JoinRequest.status, JoinRequest.created_at]
    column_sortable_list = [JoinRequest.id, JoinRequest.status, JoinRequest.created_at]
    column_default_sort = ("created_at", True)
    name = "Join Request"
    name_plural = "Join Requests"
    icon = "fa-solid fa-right-to-bracket"
    can_create = False
    can_delete = False


class ChallengeAdmin(ModelView, model=Challenge):
    column_list = [
        Challenge.id,
        Challenge.title,
        Challenge.platform,
        Challenge.status,
        Challenge.num_problems,
        Challenge.created_by_id,
        Challenge.created_at,
    ]
    column_searchable_list = [Challenge.title]
    column_sortable_list = [Challenge.id, Challenge.title, Challenge.status, Challenge.created_at]
    column_default_sort = ("created_at", True)
    name = "Challenge"
    name_plural = "Challenges"
    icon = "fa-solid fa-trophy"
    can_delete = False


class ChallengeParticipantAdmin(ModelView, model=ChallengeParticipant):
    column_list = [
        ChallengeParticipant.id,
        ChallengeParticipant.challenge_id,
        ChallengeParticipant.user_id,
        ChallengeParticipant.status,
        ChallengeParticipant.joined_at,
    ]
    column_sortable_list = [ChallengeParticipant.id, ChallengeParticipant.status]
    name = "Challenge Participant"
    name_plural = "Challenge Participants"
    icon = "fa-solid fa-user-check"
    can_create = False
    can_delete = False


class ChallengeProblemAdmin(ModelView, model=ChallengeProblem):
    column_list = [
        ChallengeProblem.id,
        ChallengeProblem.challenge_id,
        ChallengeProblem.title,
        ChallengeProblem.rating,
        ChallengeProblem.order_index,
    ]
    column_searchable_list = [ChallengeProblem.title]
    column_sortable_list = [ChallengeProblem.id, ChallengeProblem.title, ChallengeProblem.rating]
    name = "Challenge Problem"
    name_plural = "Challenge Problems"
    icon = "fa-solid fa-code"
    can_create = False
    can_delete = False


def setup_admin(app, engine) -> Admin:
    settings = get_settings()
    auth_backend = AdminAuth(secret_key=settings.secret_key)
    admin = Admin(app, engine, title="TrieQuest Admin", authentication_backend=auth_backend)
    admin.add_view(UserAdmin)
    admin.add_view(FriendshipAdmin)
    admin.add_view(GroupAdmin)
    admin.add_view(GroupMembershipAdmin)
    admin.add_view(ProblemShareAdmin)
    admin.add_view(JoinRequestAdmin)
    admin.add_view(ChallengeAdmin)
    admin.add_view(ChallengeParticipantAdmin)
    admin.add_view(ChallengeProblemAdmin)
    return admin
