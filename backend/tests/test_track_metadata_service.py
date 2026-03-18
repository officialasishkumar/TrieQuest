import asyncio

from app.services.metadata import resolve_problem


def test_resolve_problem_uses_catalog_for_known_problem() -> None:
    resolved = asyncio.run(resolve_problem("https://leetcode.com/problems/two-sum/"))

    assert resolved.title == "Two Sum"
    assert resolved.difficulty == "Easy"
    assert resolved.platform == "leetcode"
    assert resolved.signature == "leetcode::two-sum"


def test_resolve_problem_builds_reasonable_fallback_for_unknown_problem() -> None:
    resolved = asyncio.run(resolve_problem("https://leetcode.com/problems/merge-intervals-ii/"))

    assert resolved.title == "Merge Intervals Ii"
    assert resolved.difficulty == "Medium"
    assert resolved.platform == "leetcode"
    assert resolved.platform_problem_id == "merge-intervals-ii"
