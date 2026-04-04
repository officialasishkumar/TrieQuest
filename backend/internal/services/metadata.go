package services

import (
	"fmt"
	"math"
	"net/url"
	"regexp"
	"strings"
)

const (
	PlatformLeetcode     = "leetcode"
	PlatformCodeforces   = "codeforces"
	PlatformCodechef     = "codechef"
	PlatformAtcoder      = "atcoder"
	PlatformHackerrank   = "hackerrank"
	PlatformTopcoder     = "topcoder"
	PlatformGeeksforgeeks = "geeksforgeeks"
	PlatformCoder        = "coder"
)

var PlatformLabels = map[string]string{
	PlatformLeetcode:      "LeetCode",
	PlatformCodeforces:    "Codeforces",
	PlatformCodechef:      "CodeChef",
	PlatformAtcoder:       "AtCoder",
	PlatformHackerrank:    "HackerRank",
	PlatformTopcoder:      "TopCoder",
	PlatformGeeksforgeeks: "GeeksforGeeks",
	PlatformCoder:         "Coder",
}

var supportedHosts = map[string]string{
	"leetcode.com":         PlatformLeetcode,
	"www.leetcode.com":     PlatformLeetcode,
	"codeforces.com":       PlatformCodeforces,
	"www.codeforces.com":   PlatformCodeforces,
	"codechef.com":         PlatformCodechef,
	"www.codechef.com":     PlatformCodechef,
	"atcoder.jp":           PlatformAtcoder,
	"www.atcoder.jp":       PlatformAtcoder,
	"hackerrank.com":       PlatformHackerrank,
	"www.hackerrank.com":   PlatformHackerrank,
	"topcoder.com":         PlatformTopcoder,
	"www.topcoder.com":     PlatformTopcoder,
	"geeksforgeeks.org":    PlatformGeeksforgeeks,
	"www.geeksforgeeks.org": PlatformGeeksforgeeks,
	"coderbyte.com":        PlatformCoder,
	"www.coderbyte.com":    PlatformCoder,
	"coder.com":            PlatformCoder,
	"www.coder.com":        PlatformCoder,
}

type ResolvedProblem struct {
	Platform          string
	ProblemURL        string
	PlatformProblemID *string
	Title             string
	Contest           *string
	Tags              *string
	Difficulty        string
	ThumbnailURL      *string
	SolvedByCount     *int
}

func (rp *ResolvedProblem) Signature() string {
	id := ""
	if rp.PlatformProblemID != nil {
		id = *rp.PlatformProblemID
	} else {
		id = NormalizeText(rp.Title)
	}
	return rp.Platform + "::" + id
}

type problemCatalogEntry struct {
	title         string
	contest       string
	tags          string
	difficulty    string
	solvedByCount int
}

var problemCatalog = map[string]problemCatalogEntry{
	"leetcode::two-sum":                       {"Two Sum", "LeetCode Top Interview 150", "arrays,hashing", "Easy", 5938247},
	"leetcode::number-of-islands":             {"Number of Islands", "LeetCode Graph Theory", "graphs,dfs,bfs,matrix", "Medium", 1902478},
	"leetcode::lru-cache":                     {"LRU Cache", "LeetCode System Design", "design,hashing,linked-list", "Medium", 1398421},
	"leetcode::binary-tree-maximum-path-sum":  {"Binary Tree Maximum Path Sum", "LeetCode Trees", "trees,dfs,dynamic-programming", "Hard", 681223},
	"codeforces::4A":                          {"Watermelon", "Codeforces Beta Round 4", "math,bruteforce", "800", 514287},
	"codeforces::158A":                        {"Next Round", "Codeforces Beta Round 158", "implementation,sorting", "1300", 482119},
	"codeforces::71A":                         {"Way Too Long Words", "Codeforces Beta Round 71", "strings,implementation", "1700", 662904},
	"codechef::FLOW001":                       {"Add Two Numbers", "CodeChef Practice", "implementation,ad-hoc", "1★", 371104},
	"codechef::START01":                       {"Number Mirror", "CodeChef Beginner", "basics,io", "2★", 294417},
	"codechef::HS08TEST":                      {"ATM", "CodeChef Practice", "math,implementation", "3★", 285554},
	"atcoder::dp_a":                           {"Frog 1", "Educational DP Contest", "dynamic-programming", "Gray", 241221},
	"atcoder::abc085_c":                       {"Otoshidama", "AtCoder Beginner Contest 085", "bruteforce,math", "Green", 183100},
	"hackerrank::ctci-array-left-rotation":    {"Array Left Rotation", "Cracking the Coding Interview", "arrays,rotation", "Easy", 925441},
	"hackerrank::sherlock-and-anagrams":       {"Sherlock and Anagrams", "Interview Preparation Kit", "strings,hashing", "Medium", 441320},
	"topcoder::SRM-849-div2-250":              {"Contest Scoreboard", "SRM 849", "implementation,simulation", "Medium", 21045},
	"geeksforgeeks::count-pairs-with-given-sum": {"Count Pairs With Given Sum", "GeeksForGeeks Practice", "arrays,hashing", "Medium", 158230},
	"coder::sum-of-primes":                    {"Sum of Primes", "Coder Sprint", "math,sieve,number-theory", "Medium", 84210},
}

func EnsureSupportedURL(rawURL string) (canonicalURL, host string, err error) {
	trimmed := strings.TrimSpace(rawURL)
	parsed, parseErr := url.Parse(trimmed)
	if parseErr != nil || parsed.Scheme != "https" || parsed.Hostname() == "" {
		return "", "", fmt.Errorf("Problem links must use HTTPS.")
	}
	if parsed.User != nil {
		return "", "", fmt.Errorf("Problem links must not include credentials.")
	}
	if parsed.Fragment != "" {
		return "", "", fmt.Errorf("Problem links must not include fragments.")
	}

	h := strings.ToLower(parsed.Hostname())
	if _, ok := supportedHosts[h]; !ok {
		return "", "", fmt.Errorf("Unsupported coding platform. Use LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, TopCoder, GeeksForGeeks, or Coder.")
	}

	path := strings.TrimRight(parsed.Path, "/")
	if path == "" {
		path = "/"
	}
	canonical := fmt.Sprintf("https://%s%s", h, path)
	if parsed.RawQuery != "" {
		canonical += "?" + parsed.RawQuery
	}
	return canonical, h, nil
}

func DetectPlatform(rawURL string) (string, error) {
	_, host, err := EnsureSupportedURL(rawURL)
	if err != nil {
		return "", err
	}
	return supportedHosts[host], nil
}

var (
	lcProblemRe = regexp.MustCompile(`/problems/([^/]+)`)
	cfProblemRe = regexp.MustCompile(`/(?:problemset/problem|contest)/(\d+)/(?:problem/)?([A-Za-z0-9]+)`)
	acTaskRe    = regexp.MustCompile(`/tasks/([^/]+)`)
	hrChalRe    = regexp.MustCompile(`/challenges/([^/]+)`)
)

func ExtractPlatformProblemID(rawURL string) *string {
	canonical, host, err := EnsureSupportedURL(rawURL)
	if err != nil {
		return nil
	}
	parsed, _ := url.Parse(canonical)
	path := parsed.Path
	platform := supportedHosts[host]

	var id string
	switch platform {
	case PlatformLeetcode:
		m := lcProblemRe.FindStringSubmatch(path)
		if m != nil {
			id = strings.ToLower(m[1])
		}
	case PlatformCodeforces:
		m := cfProblemRe.FindStringSubmatch(path)
		if m != nil {
			id = m[1] + strings.ToUpper(m[2])
		}
	case PlatformCodechef:
		parts := pathSegments(path)
		if len(parts) > 0 {
			id = strings.ToUpper(parts[len(parts)-1])
		}
	case PlatformAtcoder:
		m := acTaskRe.FindStringSubmatch(path)
		if m != nil {
			id = strings.ToLower(m[1])
		}
	case PlatformHackerrank:
		m := hrChalRe.FindStringSubmatch(path)
		if m != nil {
			id = strings.ToLower(m[1])
		}
	case PlatformTopcoder, PlatformGeeksforgeeks, PlatformCoder:
		parts := pathSegments(path)
		if len(parts) > 0 {
			id = strings.ToLower(parts[len(parts)-1])
		}
	}

	if id == "" {
		return nil
	}
	return &id
}

func ResolveProblem(rawURL string) (*ResolvedProblem, error) {
	canonical, _, err := EnsureSupportedURL(rawURL)
	if err != nil {
		return nil, err
	}

	platform, _ := DetectPlatform(canonical)
	problemID := ExtractPlatformProblemID(canonical)

	catalogKey := platform + "::"
	if problemID != nil {
		catalogKey += *problemID
	}

	entry, found := problemCatalog[catalogKey]
	if !found {
		return buildFallback(platform, problemID, canonical), nil
	}

	contest := entry.contest
	tags := entry.tags
	solvedBy := entry.solvedByCount
	return &ResolvedProblem{
		Platform:          platform,
		ProblemURL:        canonical,
		PlatformProblemID: problemID,
		Title:             entry.title,
		Contest:           &contest,
		Tags:              &tags,
		Difficulty:        entry.difficulty,
		SolvedByCount:     &solvedBy,
	}, nil
}

func buildFallback(platform string, problemID *string, canonical string) *ResolvedProblem {
	parsed, _ := url.Parse(canonical)
	segments := pathSegments(parsed.Path)
	rawSlug := ""
	if problemID != nil {
		rawSlug = *problemID
	} else if len(segments) > 0 {
		rawSlug = segments[len(segments)-1]
	} else {
		rawSlug = PlatformLabels[platform]
	}
	title := slugToTitle(rawSlug)

	contestMap := map[string]string{
		PlatformLeetcode:      "LeetCode Practice Set",
		PlatformCodeforces:    "Codeforces Problemset",
		PlatformCodechef:      "CodeChef Practice",
		PlatformAtcoder:       "AtCoder Practice",
		PlatformHackerrank:    "HackerRank Interview Prep",
		PlatformTopcoder:      "TopCoder Arena",
		PlatformGeeksforgeeks: "GeeksForGeeks Practice",
		PlatformCoder:         "Coder Challenge Track",
	}
	contest := contestMap[platform]

	seed := absHash(platform + ":" + rawSlug)
	var difficulty string
	switch platform {
	case PlatformCodeforces:
		cfRatings := []int{800, 1000, 1200, 1400, 1600, 1800, 2100, 2400}
		difficulty = fmt.Sprintf("%d", cfRatings[seed%len(cfRatings)])
	case PlatformCodechef:
		ccStars := []string{"1★", "2★", "3★", "4★", "5★"}
		difficulty = ccStars[seed%len(ccStars)]
	case PlatformAtcoder:
		acTiers := []string{"Gray", "Brown", "Green", "Cyan", "Blue", "Yellow"}
		difficulty = acTiers[seed%len(acTiers)]
	default:
		difficulty = "Medium"
	}

	tagsMap := map[string]string{
		PlatformLeetcode:      "algorithms,data-structures",
		PlatformCodeforces:    "implementation,greedy",
		PlatformCodechef:      "ad-hoc,math",
		PlatformAtcoder:       "dynamic-programming,implementation",
		PlatformHackerrank:    "arrays,strings",
		PlatformTopcoder:      "simulation,math",
		PlatformGeeksforgeeks: "arrays,hashing",
		PlatformCoder:         "algorithms,problem-solving",
	}
	tags := tagsMap[platform]
	solvedBy := seed%900000 + 1000

	return &ResolvedProblem{
		Platform:          platform,
		ProblemURL:        canonical,
		PlatformProblemID: problemID,
		Title:             title,
		Contest:           &contest,
		Tags:              &tags,
		Difficulty:        difficulty,
		SolvedByCount:     &solvedBy,
	}
}

var genericLabels = map[string]bool{"Easy": true, "Medium": true, "Hard": true, "Unknown": true}

var cfRatingBuckets = map[string][]int{
	"Easy": {800, 900, 1000, 1100}, "Medium": {1200, 1400, 1500, 1600},
	"Hard": {1800, 2000, 2100, 2400}, "Unknown": {1200},
}
var ccNative = map[string]string{"Easy": "1★", "Medium": "3★", "Hard": "5★", "Unknown": "2★"}
var acNative = map[string]string{"Easy": "Gray", "Medium": "Green", "Hard": "Blue", "Unknown": "Brown"}

func NormalizeDifficultyForPlatform(platform, difficulty string, problemID *string) string {
	if !genericLabels[difficulty] {
		return difficulty
	}
	switch platform {
	case PlatformLeetcode:
		return difficulty
	case PlatformCodeforces:
		buckets := cfRatingBuckets[difficulty]
		if buckets == nil {
			buckets = []int{1400}
		}
		pid := "x"
		if problemID != nil {
			pid = *problemID
		}
		seed := absHash(platform + ":" + pid)
		return fmt.Sprintf("%d", buckets[seed%len(buckets)])
	case PlatformCodechef:
		if v, ok := ccNative[difficulty]; ok {
			return v
		}
		return difficulty
	case PlatformAtcoder:
		if v, ok := acNative[difficulty]; ok {
			return v
		}
		return difficulty
	default:
		return difficulty
	}
}

func NormalizeText(value string) string {
	re := regexp.MustCompile(`[^a-z0-9]+`)
	return strings.Trim(re.ReplaceAllString(strings.ToLower(strings.TrimSpace(value)), "-"), "-")
}

func pathSegments(path string) []string {
	var segments []string
	for _, s := range strings.Split(path, "/") {
		if s != "" {
			segments = append(segments, s)
		}
	}
	return segments
}

var slugCleanRe = regexp.MustCompile(`[_-]+`)
var multiSpaceRe = regexp.MustCompile(`\s+`)

func slugToTitle(value string) string {
	cleaned := slugCleanRe.ReplaceAllString(value, " ")
	cleaned = strings.TrimSpace(cleaned)
	cleaned = multiSpaceRe.ReplaceAllString(cleaned, " ")
	if cleaned == "" {
		return "Untitled Problem"
	}
	return titleCase(cleaned)
}

func titleCase(s string) string {
	words := strings.Fields(s)
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + strings.ToLower(w[1:])
		}
	}
	return strings.Join(words, " ")
}

func absHash(s string) int {
	h := 0
	for _, c := range s {
		h = 31*h + int(c)
	}
	if h < 0 {
		h = -h
	}
	return int(math.Abs(float64(h)))
}
