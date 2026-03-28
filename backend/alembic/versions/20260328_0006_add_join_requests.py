"""add join_requests table

Revision ID: 0006
Revises: 0005
Create Date: 2026-03-28
"""

from alembic import op
import sqlalchemy as sa

revision = "20260328_0006"
down_revision = "20260328_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "join_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("group_id", "user_id", name="uq_join_request"),
    )


def downgrade() -> None:
    op.drop_table("join_requests")
