"""In-memory Bloom filter for fast username availability checks.

A Bloom filter is a probabilistic data structure that answers set-membership
queries in O(k) time with zero false negatives:

- "not present" → the username is *definitely* available (skip the DB).
- "maybe present" → fall back to a DB uniqueness check.

This avoids a database round-trip on every keystroke while users type a
username during registration, and handles concurrent lookups efficiently
since the filter is in-memory with no locking required for reads.
"""

from __future__ import annotations

import hashlib
import math
import threading
from array import array


class BloomFilter:
    """Bit-array Bloom filter using double-hashing (SHA-256 based)."""

    def __init__(self, expected_items: int = 10_000, fp_rate: float = 0.01) -> None:
        self._num_bits = self._optimal_size(expected_items, fp_rate)
        self._num_hashes = self._optimal_hashes(self._num_bits, expected_items)
        self._bits = array("B", b"\x00" * math.ceil(self._num_bits / 8))
        self._lock = threading.Lock()

    # -- public API ----------------------------------------------------------

    def add(self, value: str) -> None:
        with self._lock:
            for idx in self._hash_indices(value):
                self._bits[idx // 8] |= 1 << (idx % 8)

    def might_contain(self, value: str) -> bool:
        for idx in self._hash_indices(value):
            if not (self._bits[idx // 8] & (1 << (idx % 8))):
                return False
        return True

    # -- internals -----------------------------------------------------------

    def _hash_indices(self, value: str) -> list[int]:
        digest = hashlib.sha256(value.encode()).digest()
        h1 = int.from_bytes(digest[:8], "big")
        h2 = int.from_bytes(digest[8:16], "big")
        return [(h1 + i * h2) % self._num_bits for i in range(self._num_hashes)]

    @staticmethod
    def _optimal_size(n: int, p: float) -> int:
        return max(64, int(-n * math.log(p) / (math.log(2) ** 2)))

    @staticmethod
    def _optimal_hashes(m: int, n: int) -> int:
        return max(1, int((m / max(n, 1)) * math.log(2)))


# Module-level singleton — populated at startup via load_usernames().
_filter = BloomFilter()


def load_usernames(usernames: list[str]) -> None:
    """Rebuild the filter from the full list of existing usernames."""
    global _filter
    new_filter = BloomFilter(expected_items=max(len(usernames) * 2, 10_000))
    for name in usernames:
        new_filter.add(name.lower())
    _filter = new_filter


def add_username(username: str) -> None:
    """Insert a newly registered username into the running filter."""
    _filter.add(username.lower())


def is_username_maybe_taken(username: str) -> bool:
    """Return True if the username *might* already exist (may be a false positive)."""
    return _filter.might_contain(username.lower())
