package services

import "sync"

type trieNode struct {
	children map[rune]*trieNode
	values   []string
}

type Trie struct {
	root *trieNode
	mu   sync.RWMutex
}

func NewTrie() *Trie {
	return &Trie{root: &trieNode{children: make(map[rune]*trieNode)}}
}

func (t *Trie) Insert(key string) {
	normalised := toLower(key)
	t.mu.Lock()
	defer t.mu.Unlock()

	node := t.root
	for _, ch := range normalised {
		if _, ok := node.children[ch]; !ok {
			node.children[ch] = &trieNode{children: make(map[rune]*trieNode)}
		}
		node = node.children[ch]
	}
	for _, v := range node.values {
		if v == key {
			return
		}
	}
	node.values = append(node.values, key)
}

func (t *Trie) Search(prefix string, limit int) []string {
	normalised := toLower(prefix)
	t.mu.RLock()
	defer t.mu.RUnlock()

	node := t.root
	for _, ch := range normalised {
		child, ok := node.children[ch]
		if !ok {
			return nil
		}
		node = child
	}

	var results []string
	t.collect(node, &results, limit)
	return results
}

func (t *Trie) collect(node *trieNode, results *[]string, limit int) {
	for _, val := range node.values {
		if len(*results) >= limit {
			return
		}
		*results = append(*results, val)
	}
	for _, child := range node.children {
		if len(*results) >= limit {
			return
		}
		t.collect(child, results, limit)
	}
}

func toLower(s string) string {
	b := make([]byte, len(s))
	for i := range len(s) {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 32
		}
		b[i] = c
	}
	return string(b)
}

// Module-level singletons

var (
	usernameTrie = NewTrie()
	problemTrie  = NewTrie()
)

func LoadUsernameTrie(usernames []string) {
	t := NewTrie()
	for _, name := range usernames {
		t.Insert(name)
	}
	usernameTrie = t
}

func AddUsernameToTrie(username string) {
	usernameTrie.Insert(username)
}

func SearchUsernames(prefix string, limit int) []string {
	return usernameTrie.Search(prefix, limit)
}

func LoadProblemTrie(titles []string) {
	t := NewTrie()
	for _, title := range titles {
		t.Insert(title)
	}
	problemTrie = t
}

func AddProblemToTrie(title string) {
	problemTrie.Insert(title)
}

func SearchProblems(prefix string, limit int) []string {
	return problemTrie.Search(prefix, limit)
}
