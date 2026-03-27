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
    PlatformDifficultyGroup,
    PlatformDifficultyItem,
    PlatformPoint,
    StatPoint,
    TopProblemEntry,
)
from app.services.metadata import PLATFORM_LABELS


CF_TIER_ORDER = ["Newbie", "Pupil", "Specialist", "Expert", "Candidate Master", "Master", "Grandmaster"]
CC_TIER_ORDER = ["1\u2605", "2\u2605", "3\u2605", "4\u2605", "5\u2605", "6\u2605", "7\u2605"]
ATCODER_TIER_ORDER = ["Gray", "Brown", "Green", "Cyan", "Blue", "Yellow", "Orange", "Red"]
LC_TIER_ORDER = ["Easy", "Medium", "Hard"]


_LEGACY_CF = {"Easy": "Newbie", "Medium": "Specialist", "Hard": "Expert"}
_LEGACY_CC = {"Easy": "1\u2605", "Medium": "3\u2605", "Hard": "5\u2605"}
_LEGACY_AC = {"Easy": "Gray", "Medium": "Green", "Hard": "Blue"}


def _cf_tier(difficulty: str) -> str:
    if difficulty in _LEGACY_CF:
        return _LEGACY_CF[difficulty]
    try:
        rating = int(difficulty)
    except (ValueError, TypeError):
        return difficulty
    if rating < 1200:
        return "Newbie"
    if rating < 1400:
        return "Pupil"
    if rating < 1600:
        return "Specialist"
    if rating < 1900:
        return "Expert"
    if rating < 2100:
        return "Candidate Master"
    if rating < 2400:
        return "Master"
    return "Grandmaster"


def _tier_for_platform(platform: str, difficulty: str) -> str:
    if platform == "codeforces":
        return _cf_tier(difficulty)
    if platform == "codechef":
        return _LEGACY_CC.get(difficulty, difficulty)
    if platform == "atcoder":
        return _LEGACY_AC.get(difficulty, difficulty)
    return difficulty


def _tier_order_for_platform(platform: str) -> list[str] | None:
    orders: dict[str, list[str]] = {
        "codeforces": CF_TIER_ORDER,
        "codechef": CC_TIER_ORDER,
        "atcoder": ATCODER_TIER_ORDER,
        "leetcode": LC_TIER_ORDER,
    }
    return orders.get(platform)


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

    platform_difficulty = _build_platform_difficulty(problems)

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
        platform_difficulty=platform_difficulty,
        platform_loyalty=platform_loyalty,
        weekly_activity=weekly_activity,
        monthly_trend=monthly_trend,
        member_leaderboard=member_leaderboard,
        top_problems=top_problems,
    )


def _build_platform_difficulty(problems: list[ProblemShare]) -> list[PlatformDifficultyGroup]:
    platform_groups: dict[str, list[ProblemShare]] = defaultdict(list)
    for problem in problems:
        platform_groups[problem.platform].append(problem)

    result: list[PlatformDifficultyGroup] = []
    for platform, group_problems in sorted(platform_groups.items(), key=lambda x: len(x[1]), reverse=True):
        tier_counts: Counter[str] = Counter()
        for problem in group_problems:
            tier = _tier_for_platform(platform, problem.difficulty or "Unknown")
            tier_counts[tier] += 1

        total = len(group_problems)
        tier_order = _tier_order_for_platform(platform)

        if tier_order:
            ordered_tiers = [(t, tier_counts[t]) for t in tier_order if tier_counts[t] > 0]
            remaining = [(t, c) for t, c in tier_counts.items() if t not in tier_order and c > 0]
            ordered_tiers.extend(sorted(remaining, key=lambda x: x[1], reverse=True))
        else:
            ordered_tiers = tier_counts.most_common()

        items = [
            PlatformDifficultyItem(tier=tier, count=count, percent=round((count / total) * 100))
            for tier, count in ordered_tiers
        ]
        result.append(PlatformDifficultyGroup(
            platform=PLATFORM_LABELS.get(platform, platform.title()),
            items=items,
        ))

    return result


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
