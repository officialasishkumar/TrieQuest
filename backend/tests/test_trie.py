from app.services.trie import Trie, load_username_trie, search_usernames, load_problem_trie, search_problems, add_username_to_trie, add_problem_to_trie


def test_trie_basic_insert_and_search() -> None:
    t = Trie()
    t.insert("Alice")
    t.insert("Alistair")
    t.insert("Bob")

    results = t.search("al")
    assert "Alice" in results
    assert "Alistair" in results
    assert "Bob" not in results


def test_trie_case_insensitive_search() -> None:
    t = Trie()
    t.insert("Charlie")
    assert t.search("CHA") == ["Charlie"]
    assert t.search("cha") == ["Charlie"]


def test_trie_returns_empty_for_no_match() -> None:
    t = Trie()
    t.insert("Dave")
    assert t.search("xyz") == []


def test_trie_respects_limit() -> None:
    t = Trie()
    for i in range(20):
        t.insert(f"user{i:02d}")
    results = t.search("user", limit=5)
    assert len(results) == 5


def test_trie_no_duplicates() -> None:
    t = Trie()
    t.insert("Echo")
    t.insert("Echo")
    results = t.search("ec")
    assert results == ["Echo"]


def test_module_username_trie() -> None:
    load_username_trie(["alice", "alistair", "bob"])
    results = search_usernames("ali")
    assert "alice" in results
    assert "alistair" in results
    assert "bob" not in results


def test_module_username_trie_add() -> None:
    load_username_trie(["alice"])
    add_username_to_trie("alex")
    results = search_usernames("al")
    assert "alice" in results
    assert "alex" in results


def test_module_problem_trie() -> None:
    load_problem_trie(["Two Sum", "Two City Scheduling", "Binary Search"])
    results = search_problems("two")
    assert "Two Sum" in results
    assert "Two City Scheduling" in results
    assert "Binary Search" not in results


def test_module_problem_trie_add() -> None:
    load_problem_trie(["Two Sum"])
    add_problem_to_trie("Two Pointers")
    results = search_problems("two")
    assert "Two Sum" in results
    assert "Two Pointers" in results


def test_trie_exact_match() -> None:
    t = Trie()
    t.insert("test")
    assert t.search("test") == ["test"]


def test_trie_empty_prefix_returns_all() -> None:
    t = Trie()
    t.insert("a")
    t.insert("b")
    results = t.search("")
    assert len(results) == 2
