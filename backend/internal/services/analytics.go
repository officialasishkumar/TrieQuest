package services

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"triequest-backend/internal/models"
)

type StatPoint struct {
	Label  string  `json:"label"`
	Value  string  `json:"value"`
	Change *string `json:"change"`
}

type DistributionPoint struct {
	Name  string `json:"name"`
	Value int    `json:"value"`
}

type PlatformPoint struct {
	Name     string `json:"name"`
	Problems int    `json:"problems"`
}

type DailyPoint struct {
	Day      string `json:"day"`
	Problems int    `json:"problems"`
}

type MonthlyPoint struct {
	Month    string `json:"month"`
	Problems int    `json:"problems"`
}

type MemberLeaderboardEntry struct {
	Name          string `json:"name"`
	Problems      int    `json:"problems"`
	TopDifficulty string `json:"top_difficulty"`
}

type TopProblemEntry struct {
	Title      string  `json:"title"`
	Contest    *string `json:"contest"`
	Shares     int     `json:"shares"`
	Difficulty string  `json:"difficulty"`
}

type PlatformDifficultyItem struct {
	Tier    string `json:"tier"`
	Count   int    `json:"count"`
	Percent int    `json:"percent"`
}

type PlatformDifficultyGroup struct {
	Platform string                   `json:"platform"`
	Items    []PlatformDifficultyItem `json:"items"`
}

type AnalyticsResponse struct {
	Stats                []StatPoint               `json:"stats"`
	DifficultyDistrib    []DistributionPoint       `json:"difficulty_distribution"`
	PlatformDifficulty   []PlatformDifficultyGroup `json:"platform_difficulty"`
	PlatformLoyalty      []PlatformPoint           `json:"platform_loyalty"`
	WeeklyActivity       []DailyPoint              `json:"weekly_activity"`
	MonthlyTrend         []MonthlyPoint            `json:"monthly_trend"`
	MemberLeaderboard    []MemberLeaderboardEntry  `json:"member_leaderboard"`
	TopProblems          []TopProblemEntry          `json:"top_problems"`
}

var windowMap = map[string]*int{
	"7d": intPtr(7), "30d": intPtr(30), "90d": intPtr(90), "all": nil,
}

func intPtr(i int) *int { return &i }

type ProblemWithUser struct {
	models.ProblemShare
	SharedByUsername string
}

func FilterProblemsByWindow(problems []ProblemWithUser, window string) []ProblemWithUser {
	days, ok := windowMap[window]
	if !ok {
		d := 30
		days = &d
	}
	if days == nil {
		return problems
	}
	threshold := time.Now().UTC().Add(-time.Duration(*days) * 24 * time.Hour)
	var filtered []ProblemWithUser
	for _, p := range problems {
		t := ensureAware(p.SharedAt)
		if !t.Before(threshold) {
			filtered = append(filtered, p)
		}
	}
	return filtered
}

func BuildAnalytics(problems []ProblemWithUser) AnalyticsResponse {
	total := len(problems)

	contestSet := make(map[string]struct{})
	diffCounts := make(map[string]int)
	platformCounts := make(map[string]int)

	for _, p := range problems {
		if p.Contest != nil && *p.Contest != "" {
			contestSet[strings.ToLower(strings.TrimSpace(*p.Contest))] = struct{}{}
		}
		pid := p.PlatformProblemID
		norm := NormalizeDifficultyForPlatform(p.Platform, orDefault(p.Difficulty, "Unknown"), pid)
		diffCounts[norm]++
		platformCounts[p.Platform]++
	}

	contestCount := len(contestSet)
	weeksDivisor := 1
	if total > 14 {
		weeksDivisor = max(1, int(math.Round(float64(total)/7)))
	}
	avgPerWeek := 0
	if total > 0 {
		avgPerWeek = int(math.Round(float64(total) / float64(weeksDivisor)))
	}

	var problemChange, contestChange *string
	if total > 0 {
		prev := max(total-max(1, total/5), 1)
		problemChange = percentChange(prev, total)
	}
	if contestCount > 0 {
		contestChange = percentChange(max(contestCount-2, 1), contestCount)
	}

	diffExtra := ""
	if len(diffCounts) > 0 {
		diffExtra = fmt.Sprintf("+%d", max(0, len(diffCounts)-1))
	}
	var diffChangePtr *string
	if diffExtra != "" {
		diffChangePtr = &diffExtra
	}

	stats := []StatPoint{
		{Label: "Total problems", Value: fmt.Sprintf("%d", total), Change: problemChange},
		{Label: "Unique contests", Value: fmt.Sprintf("%d", contestCount), Change: contestChange},
		{Label: "Difficulty tiers", Value: fmt.Sprintf("%d", len(diffCounts)), Change: diffChangePtr},
		{Label: "Avg. per week", Value: fmt.Sprintf("%d", avgPerWeek)},
	}

	diffDist := buildDistribution(diffCounts, total)
	platformDiff := buildPlatformDifficulty(problems)
	platformLoyalty := buildPlatformLoyalty(platformCounts)
	weeklyActivity := buildWeeklyActivity(problems)
	monthlyTrend := buildMonthlyTrend(problems)
	memberLeaderboard := buildMemberLeaderboard(problems)
	topProblems := buildTopProblems(problems)

	return AnalyticsResponse{
		Stats: stats, DifficultyDistrib: diffDist, PlatformDifficulty: platformDiff,
		PlatformLoyalty: platformLoyalty, WeeklyActivity: weeklyActivity,
		MonthlyTrend: monthlyTrend, MemberLeaderboard: memberLeaderboard,
		TopProblems: topProblems,
	}
}

func buildDistribution(counts map[string]int, total int) []DistributionPoint {
	if total == 0 {
		return []DistributionPoint{}
	}
	type kv struct {
		k string
		v int
	}
	var sorted []kv
	for k, v := range counts {
		sorted = append(sorted, kv{k, v})
	}
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].v > sorted[j].v })
	if len(sorted) > 6 {
		sorted = sorted[:6]
	}
	result := make([]DistributionPoint, len(sorted))
	for i, item := range sorted {
		result[i] = DistributionPoint{Name: item.k, Value: int(math.Round(float64(item.v) / float64(total) * 100))}
	}
	return result
}

var cfTierOrder = []string{"Newbie", "Pupil", "Specialist", "Expert", "Candidate Master", "Master", "Grandmaster"}
var ccTierOrder = []string{"1★", "2★", "3★", "4★", "5★", "6★", "7★"}
var acTierOrder = []string{"Gray", "Brown", "Green", "Cyan", "Blue", "Yellow", "Orange", "Red"}
var lcTierOrder = []string{"Easy", "Medium", "Hard"}

var legacyCF = map[string]string{"Easy": "Newbie", "Medium": "Specialist", "Hard": "Expert"}
var legacyCC = map[string]string{"Easy": "1★", "Medium": "3★", "Hard": "5★"}
var legacyAC = map[string]string{"Easy": "Gray", "Medium": "Green", "Hard": "Blue"}

func cfTier(difficulty string) string {
	if v, ok := legacyCF[difficulty]; ok {
		return v
	}
	rating := 0
	if _, err := fmt.Sscanf(difficulty, "%d", &rating); err != nil {
		return difficulty
	}
	switch {
	case rating < 1200: return "Newbie"
	case rating < 1400: return "Pupil"
	case rating < 1600: return "Specialist"
	case rating < 1900: return "Expert"
	case rating < 2100: return "Candidate Master"
	case rating < 2400: return "Master"
	default: return "Grandmaster"
	}
}

func tierForPlatform(platform, difficulty string) string {
	switch platform {
	case PlatformCodeforces: return cfTier(difficulty)
	case PlatformCodechef:
		if v, ok := legacyCC[difficulty]; ok { return v }
		return difficulty
	case PlatformAtcoder:
		if v, ok := legacyAC[difficulty]; ok { return v }
		return difficulty
	default: return difficulty
	}
}

func tierOrderForPlatform(platform string) []string {
	switch platform {
	case PlatformCodeforces: return cfTierOrder
	case PlatformCodechef: return ccTierOrder
	case PlatformAtcoder: return acTierOrder
	case PlatformLeetcode: return lcTierOrder
	default: return nil
	}
}

func buildPlatformDifficulty(problems []ProblemWithUser) []PlatformDifficultyGroup {
	groups := make(map[string][]ProblemWithUser)
	for _, p := range problems {
		groups[p.Platform] = append(groups[p.Platform], p)
	}

	type platGroup struct {
		platform string
		count    int
	}
	var sorted []platGroup
	for platform, probs := range groups {
		sorted = append(sorted, platGroup{platform, len(probs)})
	}
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].count > sorted[j].count })

	var result []PlatformDifficultyGroup
	for _, pg := range sorted {
		probs := groups[pg.platform]
		tierCounts := make(map[string]int)
		for _, p := range probs {
			norm := NormalizeDifficultyForPlatform(p.Platform, orDefault(p.Difficulty, "Unknown"), p.PlatformProblemID)
			tier := tierForPlatform(p.Platform, norm)
			tierCounts[tier]++
		}

		total := len(probs)
		tierOrder := tierOrderForPlatform(pg.platform)

		var items []PlatformDifficultyItem
		used := make(map[string]bool)
		if tierOrder != nil {
			for _, t := range tierOrder {
				if c, ok := tierCounts[t]; ok && c > 0 {
					items = append(items, PlatformDifficultyItem{Tier: t, Count: c, Percent: int(math.Round(float64(c) / float64(total) * 100))})
					used[t] = true
				}
			}
		}
		type kv struct{ k string; v int }
		var remaining []kv
		for t, c := range tierCounts {
			if !used[t] && c > 0 {
				remaining = append(remaining, kv{t, c})
			}
		}
		sort.Slice(remaining, func(i, j int) bool { return remaining[i].v > remaining[j].v })
		for _, r := range remaining {
			items = append(items, PlatformDifficultyItem{Tier: r.k, Count: r.v, Percent: int(math.Round(float64(r.v) / float64(total) * 100))})
		}

		label := PlatformLabels[pg.platform]
		if label == "" {
			label = titleCase(pg.platform)
		}
		result = append(result, PlatformDifficultyGroup{Platform: label, Items: items})
	}
	return result
}

func buildPlatformLoyalty(counts map[string]int) []PlatformPoint {
	type kv struct{ k string; v int }
	var sorted []kv
	for k, v := range counts {
		sorted = append(sorted, kv{k, v})
	}
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].v > sorted[j].v })
	result := make([]PlatformPoint, len(sorted))
	for i, item := range sorted {
		label := PlatformLabels[item.k]
		if label == "" {
			label = titleCase(item.k)
		}
		result[i] = PlatformPoint{Name: label, Problems: item.v}
	}
	return result
}

func buildWeeklyActivity(problems []ProblemWithUser) []DailyPoint {
	labels := []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
	counts := make(map[string]int)
	for _, label := range labels {
		counts[label] = 0
	}
	for _, p := range problems {
		day := ensureAware(p.SharedAt).Format("Mon")
		counts[day]++
	}
	result := make([]DailyPoint, len(labels))
	for i, label := range labels {
		result[i] = DailyPoint{Day: label, Problems: counts[label]}
	}
	return result
}

func buildMonthlyTrend(problems []ProblemWithUser) []MonthlyPoint {
	monthOrder := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
	counts := make(map[string]int)
	for _, p := range problems {
		month := ensureAware(p.SharedAt).Format("Jan")
		counts[month]++
	}
	var result []MonthlyPoint
	for _, m := range monthOrder {
		if c, ok := counts[m]; ok {
			result = append(result, MonthlyPoint{Month: m, Problems: c})
		}
	}
	return result
}

func buildMemberLeaderboard(problems []ProblemWithUser) []MemberLeaderboardEntry {
	memberProblems := make(map[string][]ProblemWithUser)
	for _, p := range problems {
		memberProblems[p.SharedByUsername] = append(memberProblems[p.SharedByUsername], p)
	}

	type kv struct {
		username string
		probs    []ProblemWithUser
	}
	var sorted []kv
	for k, v := range memberProblems {
		sorted = append(sorted, kv{k, v})
	}
	sort.Slice(sorted, func(i, j int) bool { return len(sorted[i].probs) > len(sorted[j].probs) })
	if len(sorted) > 6 {
		sorted = sorted[:6]
	}

	result := make([]MemberLeaderboardEntry, len(sorted))
	for i, item := range sorted {
		diffCounts := make(map[string]int)
		for _, p := range item.probs {
			norm := NormalizeDifficultyForPlatform(p.Platform, orDefault(p.Difficulty, "Unknown"), p.PlatformProblemID)
			diffCounts[norm]++
		}
		topDiff := ""
		topCount := 0
		for d, c := range diffCounts {
			if c > topCount {
				topDiff = d
				topCount = c
			}
		}
		result[i] = MemberLeaderboardEntry{Name: "@" + item.username, Problems: len(item.probs), TopDifficulty: topDiff}
	}
	return result
}

func buildTopProblems(problems []ProblemWithUser) []TopProblemEntry {
	grouped := make(map[string][]ProblemWithUser)
	for _, p := range problems {
		grouped[p.ProblemSignature] = append(grouped[p.ProblemSignature], p)
	}

	type kv struct {
		sig   string
		probs []ProblemWithUser
	}
	var sorted []kv
	for k, v := range grouped {
		sorted = append(sorted, kv{k, v})
	}
	sort.Slice(sorted, func(i, j int) bool { return len(sorted[i].probs) > len(sorted[j].probs) })
	if len(sorted) > 5 {
		sorted = sorted[:5]
	}

	result := make([]TopProblemEntry, len(sorted))
	for i, item := range sorted {
		rep := item.probs[0]
		result[i] = TopProblemEntry{
			Title:      rep.Title,
			Contest:    rep.Contest,
			Shares:     len(item.probs),
			Difficulty: NormalizeDifficultyForPlatform(rep.Platform, orDefault(rep.Difficulty, "Unknown"), rep.PlatformProblemID),
		}
	}
	return result
}

func ensureAware(t time.Time) time.Time {
	if t.Location() == time.UTC {
		return t
	}
	return t.UTC()
}

func orDefault(s string, def string) string {
	if s == "" {
		return def
	}
	return s
}

func percentChange(prev, curr int) *string {
	if prev <= 0 {
		return nil
	}
	change := float64(curr-prev) / float64(prev) * 100
	sign := ""
	if change >= 0 {
		sign = "+"
	}
	s := fmt.Sprintf("%s%d%%", sign, int(math.Round(change)))
	return &s
}
