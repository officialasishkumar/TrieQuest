package services

import (
	"crypto/sha256"
	"encoding/binary"
	"math"
	"strings"
	"sync"
)

type BloomFilter struct {
	bits      []byte
	numBits   int
	numHashes int
	mu        sync.RWMutex
}

func NewBloomFilter(expectedItems int, fpRate float64) *BloomFilter {
	if expectedItems < 1 {
		expectedItems = 10000
	}
	numBits := optimalSize(expectedItems, fpRate)
	numHashes := optimalHashes(numBits, expectedItems)
	return &BloomFilter{
		bits:      make([]byte, (numBits+7)/8),
		numBits:   numBits,
		numHashes: numHashes,
	}
}

func (bf *BloomFilter) Add(value string) {
	bf.mu.Lock()
	defer bf.mu.Unlock()
	for _, idx := range bf.hashIndices(value) {
		bf.bits[idx/8] |= 1 << (idx % 8)
	}
}

func (bf *BloomFilter) MightContain(value string) bool {
	bf.mu.RLock()
	defer bf.mu.RUnlock()
	for _, idx := range bf.hashIndices(value) {
		if bf.bits[idx/8]&(1<<(idx%8)) == 0 {
			return false
		}
	}
	return true
}

func (bf *BloomFilter) hashIndices(value string) []int {
	digest := sha256.Sum256([]byte(value))
	h1 := binary.BigEndian.Uint64(digest[:8])
	h2 := binary.BigEndian.Uint64(digest[8:16])
	indices := make([]int, bf.numHashes)
	for i := range bf.numHashes {
		indices[i] = int((h1 + uint64(i)*h2) % uint64(bf.numBits))
	}
	return indices
}

func optimalSize(n int, p float64) int {
	m := int(-float64(n) * math.Log(p) / (math.Log(2) * math.Log(2)))
	if m < 64 {
		return 64
	}
	return m
}

func optimalHashes(m, n int) int {
	if n < 1 {
		n = 1
	}
	k := int(float64(m) / float64(n) * math.Log(2))
	if k < 1 {
		return 1
	}
	return k
}

// Module-level singleton

var usernameFilter = NewBloomFilter(10000, 0.01)

func LoadUsernames(usernames []string) {
	size := len(usernames) * 2
	if size < 10000 {
		size = 10000
	}
	f := NewBloomFilter(size, 0.01)
	for _, name := range usernames {
		f.Add(strings.ToLower(name))
	}
	usernameFilter = f
}

func AddUsernameToBloom(username string) {
	usernameFilter.Add(strings.ToLower(username))
}

func IsUsernameMaybeTaken(username string) bool {
	return usernameFilter.MightContain(strings.ToLower(username))
}
