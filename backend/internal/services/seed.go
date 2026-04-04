package services

import (
	"log"
	"time"

	"gorm.io/gorm"

	"triequest-backend/internal/models"
	"triequest-backend/internal/security"
)

func SeedDatabase(db *gorm.DB) {
	var count int64
	db.Model(&models.User{}).Limit(1).Count(&count)
	if count > 0 {
		return
	}

	log.Println("Seeding demo data...")

	passwordHash, err := security.HashPassword("TrieQuest!123")
	if err != nil {
		log.Printf("Failed to hash seed password: %v", err)
		return
	}

	type userSpec struct {
		username, displayName, bio, topic, platform string
	}
	specs := []userSpec{
		{"alex", "Alex Rivera", "Obsessed with contest prep and clean implementations.", "graphs", "Codeforces"},
		{"maya", "Maya Chen", "Patterns, interview prep, and weekly mock rounds.", "dynamic programming", "LeetCode"},
		{"joe", "Joe Park", "Prefers tricky math problems and fast submissions.", "math", "AtCoder"},
		{"kim", "Kim Reyes", "Greedy proofs, editorial dives, and hard trees.", "trees", "Codeforces"},
		{"sam", "Sam Okonkwo", "Grinding arrays, hashes, and interview simulations.", "arrays", "LeetCode"},
		{"lee", "Lee Tanaka", "Low-noise builder. Loves implementation-heavy tasks.", "implementation", "CodeChef"},
		{"nina", "Nina Volkov", "Weekend contests and graph traversals.", "graphs", "AtCoder"},
		{"chris", "Chris Moreau", "Systematic about mediums, ruthless on easy bugs.", "strings", "HackerRank"},
		{"pat", "Pat Singh", "Time-boxed practice and accuracy tracking.", "greedy", "CodeChef"},
		{"dan", "Dan Kowalski", "Focuses on hard interviews and binary-search variants.", "binary search", "LeetCode"},
		{"eli", "Eli Torres", "Loves studying official editorials after contests.", "dfs", "GeeksForGeeks"},
		{"rue", "Rue Martin", "Alternates between ladders, mocks, and flash practice.", "bitmasks", "Coder"},
	}

	users := make(map[string]*models.User)
	for _, s := range specs {
		avatar := "https://api.dicebear.com/9.x/initials/svg?seed=" + s.displayName
		topic := s.topic
		platform := s.platform
		u := &models.User{
			Email: s.username + "@example.com", Username: s.username,
			DisplayName: s.displayName, Bio: s.bio,
			FavoriteTopic: &topic, FavoritePlatform: &platform,
			AvatarURL: &avatar, PasswordHash: &passwordHash, AuthProvider: "local",
			CreatedAt: time.Now().UTC(),
		}
		db.Create(u)
		users[s.username] = u
	}

	// Friendships
	for _, friend := range []string{"maya", "joe", "sam", "chris", "eli"} {
		db.Create(&models.Friendship{UserID: users["alex"].ID, FriendID: users[friend].ID, Status: "accepted", CreatedAt: time.Now().UTC()})
		db.Create(&models.Friendship{UserID: users[friend].ID, FriendID: users["alex"].ID, Status: "accepted", CreatedAt: time.Now().UTC()})
	}

	// Groups
	type groupSpec struct {
		name    string
		members []string
	}
	groupSpecs := []groupSpec{
		{"Interview Sprint", []string{"alex", "maya", "sam", "chris", "pat"}},
		{"Graphs After Dark", []string{"alex", "nina", "eli", "kim"}},
		{"Weekend Contest Crew", []string{"alex", "joe", "lee", "nina", "rue"}},
		{"DP Study Hall", []string{"alex", "maya", "joe", "dan"}},
		{"Implementation Ladder", []string{"alex", "kim", "lee", "pat", "rue"}},
	}
	groups := make(map[string]*models.Group)
	for _, gs := range groupSpecs {
		g := &models.Group{Name: gs.name, OwnerID: users["alex"].ID, CreatedAt: time.Now().UTC()}
		db.Create(g)
		groups[gs.name] = g
		for _, member := range gs.members {
			role := "member"
			if member == "alex" {
				role = "owner"
			}
			db.Create(&models.GroupMembership{GroupID: g.ID, UserID: users[member].ID, Role: role, CreatedAt: time.Now().UTC()})
		}
	}

	// Problems
	type problemSpec struct {
		groupName, username, url, platform, problemID, title, contest, tags, difficulty string
		solvedBy                                                                       int
	}
	problemSpecs := []problemSpec{
		{"Interview Sprint", "alex", "https://leetcode.com/problems/two-sum/", PlatformLeetcode, "two-sum", "Two Sum", "LeetCode Top Interview 150", "arrays,hashing", "Easy", 5938247},
		{"Interview Sprint", "maya", "https://www.hackerrank.com/challenges/ctci-array-left-rotation/problem", PlatformHackerrank, "ctci-array-left-rotation", "Array Left Rotation", "Cracking the Coding Interview", "arrays,rotation", "Easy", 925441},
		{"Graphs After Dark", "nina", "https://leetcode.com/problems/number-of-islands/", PlatformLeetcode, "number-of-islands", "Number of Islands", "LeetCode Graph Theory", "graphs,dfs,bfs,matrix", "Medium", 1902478},
		{"Graphs After Dark", "eli", "https://www.geeksforgeeks.org/problems/count-pairs-with-given-sum", PlatformGeeksforgeeks, "count-pairs-with-given-sum", "Count Pairs With Given Sum", "GeeksForGeeks Practice", "arrays,hashing", "Medium", 158230},
		{"Weekend Contest Crew", "joe", "https://codeforces.com/problemset/problem/4/A", PlatformCodeforces, "4A", "Watermelon", "Codeforces Beta Round 4", "math,bruteforce", "Easy", 514287},
		{"Weekend Contest Crew", "lee", "https://www.codechef.com/practice/course/basic-programming-concepts/DIFF500/problems/FLOW001", PlatformCodechef, "FLOW001", "Add Two Numbers", "CodeChef Practice", "implementation,ad-hoc", "Easy", 371104},
		{"Weekend Contest Crew", "rue", "https://coderbyte.com/challenges/sum-of-primes", PlatformCoder, "sum-of-primes", "Sum of Primes", "Coder Sprint", "math,sieve,number-theory", "Medium", 84210},
		{"DP Study Hall", "maya", "https://atcoder.jp/contests/dp/tasks/dp_a", PlatformAtcoder, "dp_a", "Frog 1", "Educational DP Contest", "dynamic-programming", "Easy", 241221},
		{"DP Study Hall", "dan", "https://leetcode.com/problems/binary-tree-maximum-path-sum/", PlatformLeetcode, "binary-tree-maximum-path-sum", "Binary Tree Maximum Path Sum", "LeetCode Trees", "trees,dfs,dynamic-programming", "Hard", 681223},
		{"Implementation Ladder", "kim", "https://codeforces.com/problemset/problem/71/A", PlatformCodeforces, "71A", "Way Too Long Words", "Codeforces Beta Round 71", "strings,implementation", "Easy", 662904},
		{"Implementation Ladder", "pat", "https://www.codechef.com/practice/course/basic-programming-concepts/DIFF500/problems/START01", PlatformCodechef, "START01", "Number Mirror", "CodeChef Beginner", "basics,io", "Easy", 294417},
		{"Implementation Ladder", "alex", "https://leetcode.com/problems/lru-cache/", PlatformLeetcode, "lru-cache", "LRU Cache", "LeetCode System Design", "design,hashing,linked-list", "Medium", 1398421},
	}

	now := time.Now().UTC()
	for i, ps := range problemSpecs {
		sig := ps.platform + "::" + ps.problemID
		p := &models.ProblemShare{
			GroupID: groups[ps.groupName].ID, SharedByID: users[ps.username].ID,
			Platform: ps.platform, ProblemURL: ps.url,
			PlatformProblemID: &ps.problemID, Title: ps.title,
			Contest: &ps.contest, Tags: &ps.tags, Difficulty: ps.difficulty,
			SolvedByCount: &ps.solvedBy, ProblemSignature: sig,
			SharedAt: now.Add(-time.Duration(i*7) * time.Hour),
		}
		db.Create(p)
	}

	log.Println("Demo data seeded successfully")
}
