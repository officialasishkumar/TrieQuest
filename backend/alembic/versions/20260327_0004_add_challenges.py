"""add challenges tables

Revision ID: 20260327_0004
Revises: 20260314_0003
Create Date: 2026-03-27
"""

from alembic import op
import sqlalchemy as sa

revision = "20260327_0004"
down_revision = "20260314_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "challenges",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("platform", sa.String(32), nullable=False, server_default="codeforces"),
        sa.Column("num_problems", sa.SmallInteger(), nullable=False, server_default="3"),
        sa.Column("min_rating", sa.Integer(), nullable=True),
        sa.Column("max_rating", sa.Integer(), nullable=True),
        sa.Column("tags", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_challenges_created_by_status", "challenges", ["created_by_id", "status"])

    op.create_table(
        "challenge_participants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("challenge_id", sa.Integer(), sa.ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="invited"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("challenge_id", "user_id", name="uq_challenge_participant"),
    )

    op.create_table(
        "challenge_problems",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("challenge_id", sa.Integer(), sa.ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("problem_url", sa.Text(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("contest_id", sa.Integer(), nullable=True),
        sa.Column("problem_index", sa.String(10), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("tags", sa.String(500), nullable=True),
        sa.Column("order_index", sa.SmallInteger(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("challenge_problems")
    op.drop_table("challenge_participants")
    op.drop_index("ix_challenges_created_by_status", table_name="challenges")
    op.drop_table("challenges")
