"""In-memory Trie for fast prefix-based autocomplete.

A Trie (prefix tree) stores strings character-by-character so that every
prefix lookup runs in O(k) time where k is the length of the query,
regardless of how many entries the index holds.

Two separate tries are maintained:

- **username trie** -- populated at startup from all registered usernames and
  kept in sync on every new registration.  Powers the friend-search
  autocomplete so the frontend can show suggestions without a DB round-trip
  on every keystroke.

- **problem-title trie** -- populated at startup from every shared problem
  title.  Lets users discover previously-shared problems by typing a few
  characters.

Both tries are module-level singletons that support lock-free concurrent
reads (the node dicts are never mutated after a reader has obtained a
reference) and serialised writes via a threading lock.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field


@dataclass
class _TrieNode:
    children: dict[str, _TrieNode] = field(default_factory=dict)
    values: list[str] = field(default_factory=list)


class Trie:
    """Prefix tree that maps lowercased keys to their original-case values."""

    def __init__(self) -> None:
        self._root = _TrieNode()
        self._lock = threading.Lock()

    def insert(self, key: str) -> None:
        """Insert *key* into the trie (stored lowercased, original kept as value)."""
        normalised = key.lower()
        with self._lock:
            node = self._root
            for ch in normalised:
                if ch not in node.children:
                    node.children[ch] = _TrieNode()
                node = node.children[ch]
            if key not in node.values:
                node.values.append(key)

    def search(self, prefix: str, limit: int = 10) -> list[str]:
        """Return up to *limit* original-case values whose key starts with *prefix*."""
        normalised = prefix.lower()
        node = self._root
        for ch in normalised:
            if ch not in node.children:
                return []
            node = node.children[ch]

        results: list[str] = []
        self._collect(node, results, limit)
        return results

    def _collect(self, node: _TrieNode, results: list[str], limit: int) -> None:
        """DFS collection of values from *node* downward."""
        for val in node.values:
            if len(results) >= limit:
                return
            results.append(val)
        for child in node.children.values():
            if len(results) >= limit:
                return
            self._collect(child, results, limit)


# ---------------------------------------------------------------------------
# Module-level singletons
# ---------------------------------------------------------------------------

_username_trie = Trie()
_problem_trie = Trie()


# -- Username trie -----------------------------------------------------------

def load_username_trie(usernames: list[str]) -> None:
    """Rebuild the username trie from scratch (called at startup)."""
    global _username_trie
    new_trie = Trie()
    for name in usernames:
        new_trie.insert(name)
    _username_trie = new_trie


def add_username_to_trie(username: str) -> None:
    """Insert a single newly-registered username."""
    _username_trie.insert(username)


def search_usernames(prefix: str, limit: int = 10) -> list[str]:
    """Return usernames matching *prefix*."""
    return _username_trie.search(prefix, limit)


# -- Problem-title trie ------------------------------------------------------

def load_problem_trie(titles: list[str]) -> None:
    """Rebuild the problem-title trie from scratch (called at startup)."""
    global _problem_trie
    new_trie = Trie()
    for title in titles:
        new_trie.insert(title)
    _problem_trie = new_trie


def add_problem_to_trie(title: str) -> None:
    """Insert a single newly-shared problem title."""
    _problem_trie.insert(title)


def search_problems(prefix: str, limit: int = 10) -> list[str]:
    """Return problem titles matching *prefix*."""
    return _problem_trie.search(prefix, limit)
