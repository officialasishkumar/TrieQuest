package services

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"
)

const (
	cfAPIURL     = "https://codeforces.com/api/problemset.problems"
	cfProblemURL = "https://codeforces.com/problemset/problem/%d/%s"
)

type CFProblem struct {
	ContestID int
	Index     string
	Name      string
	Rating    *int
	Tags      []string
}

func (p CFProblem) URL() string {
	return fmt.Sprintf(cfProblemURL, p.ContestID, p.Index)
}

func FetchCFProblems(tags []string, minRating, maxRating *int) ([]CFProblem, error) {
	client := &http.Client{Timeout: 15 * time.Second}

	url := cfAPIURL
	if len(tags) > 0 {
		url += "?tags=" + strings.Join(tags, ";")
	}

	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("codeforces API request failed: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Status string `json:"status"`
		Result struct {
			Problems []struct {
				ContestID int      `json:"contestId"`
				Index     string   `json:"index"`
				Name      string   `json:"name"`
				Rating    *int     `json:"rating"`
				Tags      []string `json:"tags"`
			} `json:"problems"`
		} `json:"result"`
		Comment string `json:"comment"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode codeforces response: %w", err)
	}

	if result.Status != "OK" {
		return nil, fmt.Errorf("codeforces API error: %s", result.Comment)
	}

	var problems []CFProblem
	for _, raw := range result.Result.Problems {
		if raw.Rating == nil {
			continue
		}
		if minRating != nil && *raw.Rating < *minRating {
			continue
		}
		if maxRating != nil && *raw.Rating > *maxRating {
			continue
		}
		problems = append(problems, CFProblem{
			ContestID: raw.ContestID,
			Index:     raw.Index,
			Name:      raw.Name,
			Rating:    raw.Rating,
			Tags:      raw.Tags,
		})
	}

	return problems, nil
}

func PickRandomProblems(problems []CFProblem, count int) []CFProblem {
	if len(problems) <= count {
		result := make([]CFProblem, len(problems))
		copy(result, problems)
		return result
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	perm := rng.Perm(len(problems))
	result := make([]CFProblem, count)
	for i := range count {
		result[i] = problems[perm[i]]
	}
	return result
}
