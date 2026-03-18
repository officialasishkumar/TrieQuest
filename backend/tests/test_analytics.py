from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.services.analytics import build_analytics


def test_build_analytics_aggregates_top_problems_and_platforms() -> None:
    now = datetime.now(timezone.utc)
    problems = [
        SimpleNamespace(
            title="Two Sum",
            contest="LeetCode Top Interview 150",
            difficulty="Easy",
            platform="leetcode",
            shared_at=now,
            problem_signature="leetcode::two-sum",
            shared_by=SimpleNamespace(username="alex"),
        ),
        SimpleNamespace(
            title="Two Sum",
            contest="LeetCode Top Interview 150",
            difficulty="Easy",
            platform="leetcode",
            shared_at=now - timedelta(days=1),
            problem_signature="leetcode::two-sum",
            shared_by=SimpleNamespace(username="maya"),
        ),
        SimpleNamespace(
            title="Watermelon",
            contest="Codeforces Beta Round 4",
            difficulty="Easy",
            platform="codeforces",
            shared_at=now - timedelta(days=2),
            problem_signature="codeforces::4a",
            shared_by=SimpleNamespace(username="alex"),
        ),
    ]

    analytics = build_analytics(problems)

    assert analytics.stats[0].value == "3"
    assert analytics.top_problems[0].title == "Two Sum"
    assert analytics.top_problems[0].shares == 2
    assert analytics.platform_loyalty[0].name == "LeetCode"
