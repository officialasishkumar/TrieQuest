package services

import (
	"sync"
	"time"
)

type RateLimitDecision struct {
	Allowed           bool
	RetryAfterSeconds int
}

type rateLimitEntry struct {
	count   int
	resetAt time.Time
}

type FixedWindowRateLimiter struct {
	maxAttempts   int
	windowSeconds int
	entries       map[string]*rateLimitEntry
	mu            sync.Mutex
}

func NewFixedWindowRateLimiter(maxAttempts, windowSeconds int) *FixedWindowRateLimiter {
	return &FixedWindowRateLimiter{
		maxAttempts:   maxAttempts,
		windowSeconds: windowSeconds,
		entries:       make(map[string]*rateLimitEntry),
	}
}

func (rl *FixedWindowRateLimiter) Check(key string) RateLimitDecision {
	now := time.Now().UTC()
	rl.mu.Lock()
	defer rl.mu.Unlock()

	entry := rl.currentEntry(key, now)
	if entry == nil || entry.count < rl.maxAttempts {
		return RateLimitDecision{Allowed: true}
	}

	retryAfter := int(entry.resetAt.Sub(now).Seconds())
	if retryAfter < 1 {
		retryAfter = 1
	}
	return RateLimitDecision{Allowed: false, RetryAfterSeconds: retryAfter}
}

func (rl *FixedWindowRateLimiter) RecordFailure(key string) {
	rl.recordAttempt(key)
}

func (rl *FixedWindowRateLimiter) RecordAttempt(key string) {
	rl.recordAttempt(key)
}

func (rl *FixedWindowRateLimiter) Clear(key string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	delete(rl.entries, key)
}

func (rl *FixedWindowRateLimiter) recordAttempt(key string) {
	now := time.Now().UTC()
	rl.mu.Lock()
	defer rl.mu.Unlock()

	entry := rl.currentEntry(key, now)
	if entry == nil {
		entry = &rateLimitEntry{
			count:   0,
			resetAt: now.Add(time.Duration(rl.windowSeconds) * time.Second),
		}
		rl.entries[key] = entry
	}
	entry.count++
}

func (rl *FixedWindowRateLimiter) currentEntry(key string, now time.Time) *rateLimitEntry {
	entry, ok := rl.entries[key]
	if !ok {
		return nil
	}
	if !entry.resetAt.After(now) {
		delete(rl.entries, key)
		return nil
	}
	return entry
}
