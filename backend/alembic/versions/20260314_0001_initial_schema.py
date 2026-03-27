from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260314_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=32), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("bio", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("favorite_topic", sa.String(length=120), nullable=True),
        sa.Column("favorite_platform", sa.String(length=120), nullable=True),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_groups_name", "groups", ["name"], unique=False)
    op.create_index("ix_groups_owner_id", "groups", ["owner_id"], unique=False)

    op.create_table(
        "friendships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("friend_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "friend_id", name="uq_friendship_pair"),
    )
    op.create_index("ix_friendships_user_id", "friendships", ["user_id"], unique=False)
    op.create_index("ix_friendships_friend_id", "friendships", ["friend_id"], unique=False)

    op.create_table(
        "group_memberships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("group_id", "user_id", name="uq_group_membership"),
    )
    op.create_index("ix_group_memberships_group_id", "group_memberships", ["group_id"], unique=False)
    op.create_index("ix_group_memberships_user_id", "group_memberships", ["user_id"], unique=False)

    op.create_table(
        "problem_shares",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("shared_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column("problem_url", sa.Text(), nullable=False),
        sa.Column("platform_problem_id", sa.String(length=120), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("contest", sa.String(length=255), nullable=True),
        sa.Column("tags", sa.String(length=255), nullable=True),
        sa.Column("difficulty", sa.String(length=64), nullable=False, server_default="Unknown"),
        sa.Column("thumbnail_url", sa.String(length=500), nullable=True),
        sa.Column("solved_by_count", sa.Integer(), nullable=True),
        sa.Column("problem_signature", sa.String(length=255), nullable=False),
        sa.Column("shared_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_problem_shares_group_id", "problem_shares", ["group_id"], unique=False)
    op.create_index("ix_problem_shares_shared_by_id", "problem_shares", ["shared_by_id"], unique=False)
    op.create_index("ix_problem_shares_platform", "problem_shares", ["platform"], unique=False)
    op.create_index("ix_problem_shares_platform_problem_id", "problem_shares", ["platform_problem_id"], unique=False)
    op.create_index("ix_problem_shares_title", "problem_shares", ["title"], unique=False)
    op.create_index("ix_problem_shares_problem_signature", "problem_shares", ["problem_signature"], unique=False)
    op.create_index("ix_problem_shares_shared_at", "problem_shares", ["shared_at"], unique=False)
    op.create_index("ix_problem_shares_group_shared_at", "problem_shares", ["group_id", "shared_at"], unique=False)
    op.create_index(
        "ix_problem_shares_shared_by_shared_at",
        "problem_shares",
        ["shared_by_id", "shared_at"],
        unique=False,
    )
    op.create_index(
        "ix_problem_shares_group_signature",
        "problem_shares",
        ["group_id", "problem_signature"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_problem_shares_group_signature", table_name="problem_shares")
    op.drop_index("ix_problem_shares_shared_by_shared_at", table_name="problem_shares")
    op.drop_index("ix_problem_shares_group_shared_at", table_name="problem_shares")
    op.drop_index("ix_problem_shares_shared_at", table_name="problem_shares")
    op.drop_index("ix_problem_shares_problem_signature", table_name="problem_shares")
    op.drop_index("ix_problem_shares_title", table_name="problem_shares")
    op.drop_index("ix_problem_shares_platform_problem_id", table_name="problem_shares")
    op.drop_index("ix_problem_shares_platform", table_name="problem_shares")
    op.drop_index("ix_problem_shares_shared_by_id", table_name="problem_shares")
    op.drop_index("ix_problem_shares_group_id", table_name="problem_shares")
    op.drop_table("problem_shares")

    op.drop_index("ix_group_memberships_user_id", table_name="group_memberships")
    op.drop_index("ix_group_memberships_group_id", table_name="group_memberships")
    op.drop_table("group_memberships")

    op.drop_index("ix_friendships_friend_id", table_name="friendships")
    op.drop_index("ix_friendships_user_id", table_name="friendships")
    op.drop_table("friendships")

    op.drop_index("ix_groups_owner_id", table_name="groups")
    op.drop_index("ix_groups_name", table_name="groups")
    op.drop_table("groups")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
