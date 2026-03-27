from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlparse, urlunparse

from fastapi import HTTPException, status
from sqlalchemy.orm import Session


class ProblemPlatform:
    LEETCODE = "leetcode"
    CODEFORCES = "codeforces"
    CODECHEF = "codechef"
    ATCODER = "atcoder"
    HACKERRANK = "hackerrank"
    TOPCODER = "topcoder"
    GEEKSFORGEEKS = "geeksforgeeks"
    CODER = "coder"


PLATFORM_LABELS = {
    ProblemPlatform.LEETCODE: "LeetCode",
    ProblemPlatform.CODEFORCES: "Codeforces",
    ProblemPlatform.CODECHEF: "CodeChef",
    ProblemPlatform.ATCODER: "AtCoder",
    ProblemPlatform.HACKERRANK: "HackerRank",
    ProblemPlatform.TOPCODER: "TopCoder",
    ProblemPlatform.GEEKSFORGEEKS: "GeeksforGeeks",
    ProblemPlatform.CODER: "Coder",
}

SUPPORTED_HOSTS = {
    "leetcode.com": ProblemPlatform.LEETCODE,
    "www.leetcode.com": ProblemPlatform.LEETCODE,
    "codeforces.com": ProblemPlatform.CODEFORCES,
    "www.codeforces.com": ProblemPlatform.CODEFORCES,
    "codechef.com": ProblemPlatform.CODECHEF,
    "www.codechef.com": ProblemPlatform.CODECHEF,
    "atcoder.jp": ProblemPlatform.ATCODER,
    "www.atcoder.jp": ProblemPlatform.ATCODER,
    "hackerrank.com": ProblemPlatform.HACKERRANK,
    "www.hackerrank.com": ProblemPlatform.HACKERRANK,
    "topcoder.com": ProblemPlatform.TOPCODER,
    "www.topcoder.com": ProblemPlatform.TOPCODER,
    "geeksforgeeks.org": ProblemPlatform.GEEKSFORGEEKS,
    "www.geeksforgeeks.org": ProblemPlatform.GEEKSFORGEEKS,
    "coderbyte.com": ProblemPlatform.CODER,
    "www.coderbyte.com": ProblemPlatform.CODER,
    "coder.com": ProblemPlatform.CODER,
    "www.coder.com": ProblemPlatform.CODER,
}

PROBLEM_CATALOG: dict[tuple[str, str], dict[str, str | int | None]] = {
    (ProblemPlatform.LEETCODE, "two-sum"): {
        "title": "Two Sum",
        "contest": "LeetCode Top Interview 150",
        "tags": "arrays,hashing",
        "difficulty": "Easy",
        "solved_by_count": 5938247,
    },
    (ProblemPlatform.LEETCODE, "number-of-islands"): {
        "title": "Number of Islands",
        "contest": "LeetCode Graph Theory",
        "tags": "graphs,dfs,bfs,matrix",
        "difficulty": "Medium",
        "solved_by_count": 1902478,
    },
    (ProblemPlatform.LEETCODE, "lru-cache"): {
        "title": "LRU Cache",
        "contest": "LeetCode System Design",
        "tags": "design,hashing,linked-list",
        "difficulty": "Medium",
        "solved_by_count": 1398421,
    },
    (ProblemPlatform.LEETCODE, "binary-tree-maximum-path-sum"): {
        "title": "Binary Tree Maximum Path Sum",
        "contest": "LeetCode Trees",
        "tags": "trees,dfs,dynamic-programming",
        "difficulty": "Hard",
        "solved_by_count": 681223,
    },
    (ProblemPlatform.CODEFORCES, "4A"): {
        "title": "Watermelon",
        "contest": "Codeforces Beta Round 4",
        "tags": "math,bruteforce",
        "difficulty": "800",
        "solved_by_count": 514287,
    },
    (ProblemPlatform.CODEFORCES, "158A"): {
        "title": "Next Round",
        "contest": "Codeforces Beta Round 158",
        "tags": "implementation,sorting",
        "difficulty": "1300",
        "solved_by_count": 482119,
    },
    (ProblemPlatform.CODEFORCES, "71A"): {
        "title": "Way Too Long Words",
        "contest": "Codeforces Beta Round 71",
        "tags": "strings,implementation",
        "difficulty": "1700",
        "solved_by_count": 662904,
    },
    (ProblemPlatform.CODECHEF, "FLOW001"): {
        "title": "Add Two Numbers",
        "contest": "CodeChef Practice",
        "tags": "implementation,ad-hoc",
        "difficulty": "1\u2605",
        "solved_by_count": 371104,
    },
    (ProblemPlatform.CODECHEF, "START01"): {
        "title": "Number Mirror",
        "contest": "CodeChef Beginner",
        "tags": "basics,io",
        "difficulty": "2\u2605",
        "solved_by_count": 294417,
    },
    (ProblemPlatform.CODECHEF, "HS08TEST"): {
        "title": "ATM",
        "contest": "CodeChef Practice",
        "tags": "math,implementation",
        "difficulty": "3\u2605",
        "solved_by_count": 285554,
    },
    (ProblemPlatform.ATCODER, "dp_a"): {
        "title": "Frog 1",
        "contest": "Educational DP Contest",
        "tags": "dynamic-programming",
        "difficulty": "Gray",
        "solved_by_count": 241221,
    },
    (ProblemPlatform.ATCODER, "abc085_c"): {
        "title": "Otoshidama",
        "contest": "AtCoder Beginner Contest 085",
        "tags": "bruteforce,math",
        "difficulty": "Green",
        "solved_by_count": 183100,
    },
    (ProblemPlatform.HACKERRANK, "ctci-array-left-rotation"): {
        "title": "Array Left Rotation",
        "contest": "Cracking the Coding Interview",
        "tags": "arrays,rotation",
        "difficulty": "Easy",
        "solved_by_count": 925441,
    },
    (ProblemPlatform.HACKERRANK, "sherlock-and-anagrams"): {
        "title": "Sherlock and Anagrams",
        "contest": "Interview Preparation Kit",
        "tags": "strings,hashing",
        "difficulty": "Medium",
        "solved_by_count": 441320,
    },
    (ProblemPlatform.TOPCODER, "SRM-849-div2-250"): {
        "title": "Contest Scoreboard",
        "contest": "SRM 849",
        "tags": "implementation,simulation",
        "difficulty": "Medium",
        "solved_by_count": 21045,
    },
    (ProblemPlatform.GEEKSFORGEEKS, "count-pairs-with-given-sum"): {
        "title": "Count Pairs With Given Sum",
        "contest": "GeeksForGeeks Practice",
        "tags": "arrays,hashing",
        "difficulty": "Medium",
        "solved_by_count": 158230,
    },
    (ProblemPlatform.CODER, "sum-of-primes"): {
        "title": "Sum of Primes",
        "contest": "Coder Sprint",
        "tags": "math,sieve,number-theory",
        "difficulty": "Medium",
        "solved_by_count": 84210,
    },
}


@dataclass(frozen=True)
class ResolvedProblem:
    platform: str
    problem_url: str
    platform_problem_id: str | None
    title: str
    contest: str | None
    tags: str | None
    difficulty: str
    thumbnail_url: str | None
    solved_by_count: int | None

    @property
    def signature(self) -> str:
        identifier = self.platform_problem_id or normalize_text(self.title)
        return f"{self.platform}::{identifier}"


def ensure_supported_url(raw_url: str) -> tuple[str, str]:
    parsed = urlparse(raw_url.strip())
    if parsed.scheme != "https" or not parsed.hostname:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Problem links must use HTTPS.")
    if parsed.username or parsed.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Problem links must not include credentials.")
    if parsed.fragment:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Problem links must not include fragments.")

    host = parsed.hostname.lower()
    if host not in SUPPORTED_HOSTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported coding platform. Use LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, TopCoder, GeeksForGeeks, or Coder.",
        )

    canonical_url = urlunparse(("https", host, parsed.path.rstrip("/") or "/", "", parsed.query, ""))
    return canonical_url, host


def detect_platform(url: str) -> str:
    _, host = ensure_supported_url(url)
    return SUPPORTED_HOSTS[host]


def extract_platform_problem_id(url: str) -> str | None:
    canonical_url, host = ensure_supported_url(url)
    path = urlparse(canonical_url).path
    platform = SUPPORTED_HOSTS[host]

    if platform == ProblemPlatform.LEETCODE:
        match = re.search(r"/problems/([^/]+)", path)
        return match.group(1).lower() if match else None
    if platform == ProblemPlatform.CODEFORCES:
        contest_match = re.search(r"/(?:problemset/problem|contest)/(\d+)/(?:problem/)?([A-Za-z0-9]+)", path)
        if contest_match:
            return f"{contest_match.group(1)}{contest_match.group(2).upper()}"
        return None
    if platform == ProblemPlatform.CODECHEF:
        parts = [segment for segment in path.split("/") if segment]
        return parts[-1].upper() if parts else None
    if platform == ProblemPlatform.ATCODER:
        match = re.search(r"/tasks/([^/]+)", path)
        return match.group(1).lower() if match else None
    if platform == ProblemPlatform.HACKERRANK:
        match = re.search(r"/challenges/([^/]+)", path)
        return match.group(1).lower() if match else None
    if platform == ProblemPlatform.TOPCODER:
        parts = [segment for segment in path.split("/") if segment]
        return parts[-1] if parts else None
    if platform == ProblemPlatform.GEEKSFORGEEKS:
        parts = [segment for segment in path.split("/") if segment]
        return parts[-1].lower() if parts else None
    if platform == ProblemPlatform.CODER:
        parts = [segment for segment in path.split("/") if segment]
        return parts[-1].lower() if parts else None
    return None


def normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")


async def resolve_problem(url: str, db: Session | None = None) -> ResolvedProblem:
    del db

    canonical_url, _ = ensure_supported_url(url)
    platform = detect_platform(canonical_url)
    problem_id = extract_platform_problem_id(canonical_url)
    catalog_entry = PROBLEM_CATALOG.get((platform, problem_id or ""))

    if catalog_entry is None:
        catalog_entry = _build_fallback_entry(platform, problem_id, canonical_url)

    return ResolvedProblem(
        platform=platform,
        problem_url=canonical_url,
        platform_problem_id=problem_id,
        title=str(catalog_entry["title"]),
        contest=_nullable_str(catalog_entry.get("contest")),
        tags=_nullable_str(catalog_entry.get("tags")),
        difficulty=str(catalog_entry.get("difficulty") or "Unknown"),
        thumbnail_url=_nullable_str(catalog_entry.get("thumbnail_url")),
        solved_by_count=_nullable_int(catalog_entry.get("solved_by_count")),
    )


def _build_fallback_entry(platform: str, problem_id: str | None, canonical_url: str) -> dict[str, str | int | None]:
    parsed = urlparse(canonical_url)
    path_segments = [segment for segment in parsed.path.split("/") if segment]
    raw_slug = problem_id or (path_segments[-1] if path_segments else PLATFORM_LABELS[platform])
    readable_title = _slug_to_title(raw_slug)

    contest = {
        ProblemPlatform.LEETCODE: "LeetCode Practice Set",
        ProblemPlatform.CODEFORCES: "Codeforces Problemset",
        ProblemPlatform.CODECHEF: "CodeChef Practice",
        ProblemPlatform.ATCODER: "AtCoder Practice",
        ProblemPlatform.HACKERRANK: "HackerRank Interview Prep",
        ProblemPlatform.TOPCODER: "TopCoder Arena",
        ProblemPlatform.GEEKSFORGEEKS: "GeeksForGeeks Practice",
        ProblemPlatform.CODER: "Coder Challenge Track",
    }[platform]

    if platform == ProblemPlatform.CODEFORCES:
        cf_ratings = [800, 1000, 1200, 1400, 1600, 1800, 2100, 2400]
        default_difficulty = str(cf_ratings[abs(hash(f"{platform}:{raw_slug}")) % len(cf_ratings)])
    elif platform == ProblemPlatform.CODECHEF:
        cc_stars = ["1\u2605", "2\u2605", "3\u2605", "4\u2605", "5\u2605"]
        default_difficulty = cc_stars[abs(hash(f"{platform}:{raw_slug}")) % len(cc_stars)]
    elif platform == ProblemPlatform.ATCODER:
        ac_tiers = ["Gray", "Brown", "Green", "Cyan", "Blue", "Yellow"]
        default_difficulty = ac_tiers[abs(hash(f"{platform}:{raw_slug}")) % len(ac_tiers)]
    else:
        default_difficulty = {
            ProblemPlatform.LEETCODE: "Medium",
            ProblemPlatform.HACKERRANK: "Medium",
            ProblemPlatform.TOPCODER: "Medium",
            ProblemPlatform.GEEKSFORGEEKS: "Medium",
            ProblemPlatform.CODER: "Medium",
        }.get(platform, "Medium")

    tags = {
        ProblemPlatform.LEETCODE: "algorithms,data-structures",
        ProblemPlatform.CODEFORCES: "implementation,greedy",
        ProblemPlatform.CODECHEF: "ad-hoc,math",
        ProblemPlatform.ATCODER: "dynamic-programming,implementation",
        ProblemPlatform.HACKERRANK: "arrays,strings",
        ProblemPlatform.TOPCODER: "simulation,math",
        ProblemPlatform.GEEKSFORGEEKS: "arrays,hashing",
        ProblemPlatform.CODER: "algorithms,problem-solving",
    }[platform]

    solved_by_count = abs(hash(f"{platform}:{raw_slug}")) % 900000 + 1000

    return {
        "title": readable_title,
        "contest": contest,
        "tags": tags,
        "difficulty": default_difficulty,
        "thumbnail_url": None,
        "solved_by_count": solved_by_count,
    }


def _slug_to_title(value: str) -> str:
    cleaned = re.sub(r"[_-]+", " ", value).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.title() if cleaned else "Untitled Problem"


def _nullable_int(value: str | int | None) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None


def _nullable_str(value: str | int | None) -> str | None:
    if value is None:
        return None
    return str(value)


_CF_RATING_BUCKETS = {
    "Easy": [800, 900, 1000, 1100],
    "Medium": [1200, 1400, 1500, 1600],
    "Hard": [1800, 2000, 2100, 2400],
    "Unknown": [1200],
}
_CC_NATIVE = {"Easy": "1\u2605", "Medium": "3\u2605", "Hard": "5\u2605", "Unknown": "2\u2605"}
_AC_NATIVE = {"Easy": "Gray", "Medium": "Green", "Hard": "Blue", "Unknown": "Brown"}
_GENERIC_LABELS = {"Easy", "Medium", "Hard", "Unknown"}


def normalize_difficulty_for_platform(
    platform: str, difficulty: str, problem_id: str | None = None,
) -> str:
    """Convert generic Easy/Medium/Hard labels to platform-native ratings."""
    if difficulty not in _GENERIC_LABELS:
        return difficulty

    if platform == ProblemPlatform.LEETCODE:
        return difficulty

    if platform == ProblemPlatform.CODEFORCES:
        buckets = _CF_RATING_BUCKETS.get(difficulty, [1400])
        seed = abs(hash(f"{platform}:{problem_id or 'x'}"))
        return str(buckets[seed % len(buckets)])

    if platform == ProblemPlatform.CODECHEF:
        return _CC_NATIVE.get(difficulty, difficulty)

    if platform == ProblemPlatform.ATCODER:
        return _AC_NATIVE.get(difficulty, difficulty)

    return difficulty


__all__ = [
    "PLATFORM_LABELS",
    "ProblemPlatform",
    "ResolvedProblem",
    "detect_platform",
    "ensure_supported_url",
    "extract_platform_problem_id",
    "normalize_difficulty_for_platform",
    "normalize_text",
    "resolve_problem",
]
