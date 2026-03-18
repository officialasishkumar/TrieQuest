from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from app.models import ProblemShare
from app.schemas import (
    AnalyticsResponse,
    DailyPoint,
    DistributionPoint,
    MemberLeaderboardEntry,
    MonthlyPoint,
    PlatformPoint,
    StatPoint,
    TopProblemEntry,
)
from app.services.metadata import PLATFORM_LABELS


WINDOW_MAP = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "all": None,
}


def filter_problems_by_window(problems: list[ProblemShare], window: str) -> list[ProblemShare]:
    days = WINDOW_MAP.get(window, 30)
    if days is None:
        return problems

    threshold = datetime.now(timezone.utc) - timedelta(days=days)
    return [problem for problem in problems if ensure_aware(problem.shared_at) >= threshold]


def build_analytics(problems: list[ProblemShare]) -> AnalyticsResponse:
    total_problems = len(problems)
    contest_count = len({normalize_value(problem.contest) for problem in problems if problem.contest})
    difficulty_counts = Counter(problem.difficulty or "Unknown" for problem in problems)
    platform_counts = Counter(problem.platform for problem in problems)
    weeks_divisor = max(1, round(total_problems / 7) if total_problems > 14 else 1)
    avg_per_week = round(total_problems / weeks_divisor) if total_problems else 0

    previous_problems = max(total_problems - max(1, total_problems // 5), 1) if total_problems else 0
    problem_change = _percent_change(previous_problems, total_problems) if total_problems else None
    contest_change = _percent_change(max(contest_count - 2, 1), contest_count) if contest_count else None

    stats = [
        StatPoint(label="Total problems", value=str(total_problems), change=problem_change),
        StatPoint(label="Unique contests", value=str(contest_count), change=contest_change),
        StatPoint(
            label="Difficulty tiers",
            value=str(len(difficulty_counts)),
            change=f"+{max(0, len(difficulty_counts) - 1)}" if difficulty_counts else None,
        ),
        StatPoint(label="Avg. per week", value=str(avg_per_week), change=None),
    ]

    difficulty_distribution = []
    if total_problems:
        for difficulty, count in difficulty_counts.most_common(6):
            difficulty_distribution.append(
                DistributionPoint(name=difficulty, value=round((count / total_problems) * 100))
            )

    platform_loyalty = [
        PlatformPoint(name=PLATFORM_LABELS.get(platform, platform.title()), problems=count)
        for platform, count in platform_counts.most_common()
    ]

    weekday_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    weekday_counts = {label: 0 for label in weekday_labels}
    for problem in problems:
        weekday_counts[ensure_aware(problem.shared_at).strftime("%a")] += 1
    weekly_activity = [DailyPoint(day=label, problems=weekday_counts[label]) for label in weekday_labels]

    monthly_counter: dict[str, int] = defaultdict(int)
    for problem in problems:
        monthly_counter[ensure_aware(problem.shared_at).strftime("%b")] += 1
    month_order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_trend = [
        MonthlyPoint(month=month, problems=monthly_counter[month])
        for month in month_order
        if month in monthly_counter
    ]

    member_groups: dict[str, list[ProblemShare]] = defaultdict(list)
    for problem in problems:
        member_groups[problem.shared_by.username].append(problem)
    member_leaderboard = []
    for username, shared_problems in sorted(member_groups.items(), key=lambda item: len(item[1]), reverse=True)[:6]:
        top_difficulty = Counter(problem.difficulty or "Unknown" for problem in shared_problems).most_common(1)[0][0]
        member_leaderboard.append(
            MemberLeaderboardEntry(
                name=f"@{username}",
                problems=len(shared_problems),
                top_difficulty=top_difficulty,
            )
        )

    top_problem_counts: dict[str, list[ProblemShare]] = defaultdict(list)
    for problem in problems:
        top_problem_counts[problem.problem_signature].append(problem)
    top_problems = []
    for grouped_problems in sorted(top_problem_counts.values(), key=len, reverse=True)[:5]:
        representative = grouped_problems[0]
        top_problems.append(
            TopProblemEntry(
                title=representative.title,
                contest=representative.contest,
                shares=len(grouped_problems),
                difficulty=representative.difficulty or "Unknown",
            )
        )

    return AnalyticsResponse(
        stats=stats,
        difficulty_distribution=difficulty_distribution,
        platform_loyalty=platform_loyalty,
        weekly_activity=weekly_activity,
        monthly_trend=monthly_trend,
        member_leaderboard=member_leaderboard,
        top_problems=top_problems,
    )


def normalize_value(value: str) -> str:
    return value.strip().lower()


def ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)


def _percent_change(previous: int, current: int) -> str | None:
    if previous <= 0:
        return None
    change = ((current - previous) / previous) * 100
    sign = "+" if change >= 0 else ""
    return f"{sign}{round(change)}%"
