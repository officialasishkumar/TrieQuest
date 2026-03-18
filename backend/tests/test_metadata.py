import pytest
from fastapi import HTTPException

from app.services.metadata import ProblemPlatform, detect_platform, ensure_supported_url, extract_platform_problem_id


def test_detect_platform_supports_core_problem_sites() -> None:
    assert detect_platform("https://leetcode.com/problems/two-sum/") == ProblemPlatform.LEETCODE
    assert detect_platform("https://codeforces.com/problemset/problem/4/A") == ProblemPlatform.CODEFORCES
    assert detect_platform("https://www.codechef.com/problems/FLOW001") == ProblemPlatform.CODECHEF
    assert detect_platform("https://atcoder.jp/contests/dp/tasks/dp_a") == ProblemPlatform.ATCODER
    assert detect_platform("https://www.hackerrank.com/challenges/ctci-array-left-rotation/problem") == ProblemPlatform.HACKERRANK


def test_extract_platform_problem_id_handles_platform_specific_shapes() -> None:
    assert extract_platform_problem_id("https://leetcode.com/problems/two-sum/") == "two-sum"
    assert extract_platform_problem_id("https://codeforces.com/problemset/problem/4/A") == "4A"
    assert extract_platform_problem_id("https://atcoder.jp/contests/dp/tasks/dp_a") == "dp_a"


@pytest.mark.parametrize(
    ("url", "message"),
    [
        ("http://leetcode.com/problems/two-sum/", "HTTPS"),
        ("https://user:pass@leetcode.com/problems/two-sum/", "credentials"),
        ("https://leetcode.com/problems/two-sum/#fragment", "fragments"),
    ],
)
def test_ensure_supported_url_rejects_unsafe_provider_urls(url: str, message: str) -> None:
    with pytest.raises(HTTPException, match=message):
        ensure_supported_url(url)


def test_ensure_supported_url_rejects_unknown_hosts() -> None:
    with pytest.raises(HTTPException, match="Unsupported coding platform"):
        ensure_supported_url("https://example.com/problems/abc")
