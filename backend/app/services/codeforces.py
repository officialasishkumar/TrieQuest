from __future__ import annotations

import random
from dataclasses import dataclass

import httpx

CF_API_URL = "https://codeforces.com/api/problemset.problems"
CF_PROBLEM_URL = "https://codeforces.com/problemset/problem/{contest_id}/{index}"

CF_TAGS = [
    "2-sat", "binary search", "bitmasks", "brute force", "combinatorics",
    "constructive algorithms", "data structures", "dfs and similar",
    "divide and conquer", "dp", "dsu", "expression parsing", "fft",
    "flows", "games", "geometry", "graph matchings", "graphs", "greedy",
    "hashing", "implementation", "interactive", "math", "matrices",
    "meet-in-the-middle", "number theory", "probabilities", "schedules",
    "shortest paths", "sortings", "string suffix structures", "strings",
    "ternary search", "trees", "two pointers",
]


@dataclass(frozen=True)
class CFProblem:
    contest_id: int
    index: str
    name: str
    rating: int | None
    tags: list[str]

    @property
    def url(self) -> str:
        return CF_PROBLEM_URL.format(contest_id=self.contest_id, index=self.index)


async def fetch_cf_problems(
    tags: list[str] | None = None,
    min_rating: int | None = None,
    max_rating: int | None = None,
) -> list[CFProblem]:
    params: dict[str, str] = {}
    if tags:
        params["tags"] = ";".join(tags)

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(CF_API_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    if data.get("status") != "OK":
        raise RuntimeError(f"Codeforces API error: {data.get('comment', 'unknown')}")

    problems: list[CFProblem] = []
    for raw in data["result"]["problems"]:
        rating = raw.get("rating")
        if rating is None:
            continue
        if min_rating is not None and rating < min_rating:
            continue
        if max_rating is not None and rating > max_rating:
            continue
        problems.append(CFProblem(
            contest_id=raw["contestId"],
            index=raw["index"],
            name=raw["name"],
            rating=rating,
            tags=raw.get("tags", []),
        ))

    return problems


def pick_random_problems(problems: list[CFProblem], count: int) -> list[CFProblem]:
    if len(problems) <= count:
        return list(problems)
    return random.sample(problems, count)
