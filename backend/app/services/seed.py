from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Friendship, Group, GroupMembership, ProblemShare, User
from app.security import hash_password
from app.services.metadata import ProblemPlatform, ResolvedProblem


def seed_database(db: Session) -> None:
    existing_user = db.scalar(select(User).limit(1))
    if existing_user is not None:
        return

    users = {
        username: User(
            email=f"{username}@example.com",
            username=username,
            display_name=display_name,
            bio=bio,
            favorite_topic=favorite_topic,
            favorite_platform=favorite_platform,
            avatar_url=f"https://api.dicebear.com/9.x/initials/svg?seed={display_name.replace(' ', '%20')}",
            password_hash=hash_password("TrieQuest!123"),
        )
        for username, display_name, bio, favorite_topic, favorite_platform in [
            ("alex", "Alex Rivera", "Obsessed with contest prep and clean implementations.", "graphs", "Codeforces"),
            ("maya", "Maya Chen", "Patterns, interview prep, and weekly mock rounds.", "dynamic programming", "LeetCode"),
            ("joe", "Joe Park", "Prefers tricky math problems and fast submissions.", "math", "AtCoder"),
            ("kim", "Kim Reyes", "Greedy proofs, editorial dives, and hard trees.", "trees", "Codeforces"),
            ("sam", "Sam Okonkwo", "Grinding arrays, hashes, and interview simulations.", "arrays", "LeetCode"),
            ("lee", "Lee Tanaka", "Low-noise builder. Loves implementation-heavy tasks.", "implementation", "CodeChef"),
            ("nina", "Nina Volkov", "Weekend contests and graph traversals.", "graphs", "AtCoder"),
            ("chris", "Chris Moreau", "Systematic about mediums, ruthless on easy bugs.", "strings", "HackerRank"),
            ("pat", "Pat Singh", "Time-boxed practice and accuracy tracking.", "greedy", "CodeChef"),
            ("dan", "Dan Kowalski", "Focuses on hard interviews and binary-search variants.", "binary search", "LeetCode"),
            ("eli", "Eli Torres", "Loves studying official editorials after contests.", "dfs", "GeeksForGeeks"),
            ("rue", "Rue Martin", "Alternates between ladders, mocks, and flash practice.", "bitmasks", "Coder"),
        ]
    }
    db.add_all(users.values())
    db.flush()

    for friend_username in ["maya", "joe", "sam", "chris", "eli"]:
        db.add(Friendship(user_id=users["alex"].id, friend_id=users[friend_username].id, status="accepted"))
        db.add(Friendship(user_id=users[friend_username].id, friend_id=users["alex"].id, status="accepted"))

    groups = [
        _create_group(db, "Interview Sprint", users["alex"], ["alex", "maya", "sam", "chris", "pat"]),
        _create_group(db, "Graphs After Dark", users["alex"], ["alex", "nina", "eli", "kim"]),
        _create_group(db, "Weekend Contest Crew", users["alex"], ["alex", "joe", "lee", "nina", "rue"]),
        _create_group(db, "DP Study Hall", users["alex"], ["alex", "maya", "joe", "dan"]),
        _create_group(db, "Implementation Ladder", users["alex"], ["alex", "kim", "lee", "pat", "rue"]),
    ]
    db.flush()

    seeded_problems = [
        ("Interview Sprint", "alex", _demo_problem(
            "https://leetcode.com/problems/two-sum/",
            ProblemPlatform.LEETCODE,
            "two-sum",
            "Two Sum",
            "LeetCode Top Interview 150",
            "arrays,hashing",
            "Easy",
            5938247,
        )),
        ("Interview Sprint", "maya", _demo_problem(
            "https://www.hackerrank.com/challenges/ctci-array-left-rotation/problem",
            ProblemPlatform.HACKERRANK,
            "ctci-array-left-rotation",
            "Array Left Rotation",
            "Cracking the Coding Interview",
            "arrays,rotation",
            "Easy",
            925441,
        )),
        ("Graphs After Dark", "nina", _demo_problem(
            "https://leetcode.com/problems/number-of-islands/",
            ProblemPlatform.LEETCODE,
            "number-of-islands",
            "Number of Islands",
            "LeetCode Graph Theory",
            "graphs,dfs,bfs,matrix",
            "Medium",
            1902478,
        )),
        ("Graphs After Dark", "eli", _demo_problem(
            "https://www.geeksforgeeks.org/problems/count-pairs-with-given-sum",
            ProblemPlatform.GEEKSFORGEEKS,
            "count-pairs-with-given-sum",
            "Count Pairs With Given Sum",
            "GeeksForGeeks Practice",
            "arrays,hashing",
            "Medium",
            158230,
        )),
        ("Weekend Contest Crew", "joe", _demo_problem(
            "https://codeforces.com/problemset/problem/4/A",
            ProblemPlatform.CODEFORCES,
            "4A",
            "Watermelon",
            "Codeforces Beta Round 4",
            "math,bruteforce",
            "Easy",
            514287,
        )),
        ("Weekend Contest Crew", "lee", _demo_problem(
            "https://www.codechef.com/practice/course/basic-programming-concepts/DIFF500/problems/FLOW001",
            ProblemPlatform.CODECHEF,
            "FLOW001",
            "Add Two Numbers",
            "CodeChef Practice",
            "implementation,ad-hoc",
            "Easy",
            371104,
        )),
        ("Weekend Contest Crew", "rue", _demo_problem(
            "https://coderbyte.com/challenges/sum-of-primes",
            ProblemPlatform.CODER,
            "sum-of-primes",
            "Sum of Primes",
            "Coder Sprint",
            "math,sieve,number-theory",
            "Medium",
            84210,
        )),
        ("DP Study Hall", "maya", _demo_problem(
            "https://atcoder.jp/contests/dp/tasks/dp_a",
            ProblemPlatform.ATCODER,
            "dp_a",
            "Frog 1",
            "Educational DP Contest",
            "dynamic-programming",
            "Easy",
            241221,
        )),
        ("DP Study Hall", "dan", _demo_problem(
            "https://leetcode.com/problems/binary-tree-maximum-path-sum/",
            ProblemPlatform.LEETCODE,
            "binary-tree-maximum-path-sum",
            "Binary Tree Maximum Path Sum",
            "LeetCode Trees",
            "trees,dfs,dynamic-programming",
            "Hard",
            681223,
        )),
        ("Implementation Ladder", "kim", _demo_problem(
            "https://codeforces.com/problemset/problem/71/A",
            ProblemPlatform.CODEFORCES,
            "71A",
            "Way Too Long Words",
            "Codeforces Beta Round 71",
            "strings,implementation",
            "Easy",
            662904,
        )),
        ("Implementation Ladder", "pat", _demo_problem(
            "https://www.codechef.com/practice/course/basic-programming-concepts/DIFF500/problems/START01",
            ProblemPlatform.CODECHEF,
            "START01",
            "Number Mirror",
            "CodeChef Beginner",
            "basics,io",
            "Easy",
            294417,
        )),
        ("Implementation Ladder", "alex", _demo_problem(
            "https://leetcode.com/problems/lru-cache/",
            ProblemPlatform.LEETCODE,
            "lru-cache",
            "LRU Cache",
            "LeetCode System Design",
            "design,hashing,linked-list",
            "Medium",
            1398421,
        )),
    ]

    now = datetime.now(timezone.utc)
    for index, (group_name, username, resolved) in enumerate(seeded_problems):
        group = next(group for group in groups if group.name == group_name)
        problem = ProblemShare(
            group_id=group.id,
            shared_by_id=users[username].id,
            platform=resolved.platform,
            problem_url=resolved.problem_url,
            platform_problem_id=resolved.platform_problem_id,
            title=resolved.title,
            contest=resolved.contest,
            tags=resolved.tags,
            difficulty=resolved.difficulty,
            thumbnail_url=resolved.thumbnail_url,
            solved_by_count=resolved.solved_by_count,
            problem_signature=resolved.signature,
            shared_at=now - timedelta(hours=index * 7),
        )
        db.add(problem)

    db.commit()


def _create_group(db: Session, name: str, owner: User, usernames: list[str]) -> Group:
    group = Group(name=name, owner_id=owner.id)
    db.add(group)
    db.flush()

    for username in usernames:
        db.add(
            GroupMembership(
                group_id=group.id,
                user_id=db.scalar(select(User.id).where(User.username == username)),
                role="owner" if username == owner.username else "member",
            )
        )

    return group


def _demo_problem(
    url: str,
    platform: str,
    platform_problem_id: str,
    title: str,
    contest: str,
    tags: str,
    difficulty: str,
    solved_by_count: int,
) -> ResolvedProblem:
    return ResolvedProblem(
        platform=platform,
        problem_url=url,
        platform_problem_id=platform_problem_id,
        title=title,
        contest=contest,
        tags=tags,
        difficulty=difficulty,
        thumbnail_url=None,
        solved_by_count=solved_by_count,
    )
