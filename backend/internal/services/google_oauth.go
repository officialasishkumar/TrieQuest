package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"triequest-backend/internal/config"
)

const (
	googleTokenURL    = "https://oauth2.googleapis.com/token"
	googleUserInfoURL = "https://www.googleapis.com/oauth2/v2/userinfo"
)

type GoogleUser struct {
	GoogleID      string
	Email         string
	Name          string
	Picture       *string
	EmailVerified bool
}

func ExchangeCodeForUser(code string, cfg *config.Settings) (*GoogleUser, error) {
	if cfg.GoogleClientID == "" || cfg.GoogleClientSecret == "" {
		return nil, fmt.Errorf("Google OAuth is not configured")
	}

	client := &http.Client{Timeout: 15 * time.Second}

	// Exchange code for tokens
	form := url.Values{}
	form.Set("code", code)
	form.Set("client_id", cfg.GoogleClientID)
	form.Set("client_secret", cfg.GoogleClientSecret)
	form.Set("redirect_uri", cfg.GoogleRedirectURI)
	form.Set("grant_type", "authorization_code")

	tokenResp, err := client.PostForm(googleTokenURL, form)
	if err != nil {
		return nil, fmt.Errorf("token exchange failed: %w", err)
	}
	defer tokenResp.Body.Close()

	if tokenResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token exchange returned status %d", tokenResp.StatusCode)
	}

	var tokens struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(tokenResp.Body).Decode(&tokens); err != nil {
		return nil, fmt.Errorf("failed to decode token response: %w", err)
	}

	// Fetch user info
	req, _ := http.NewRequest("GET", googleUserInfoURL, nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	infoResp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("user info request failed: %w", err)
	}
	defer infoResp.Body.Close()

	if infoResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("user info returned status %d", infoResp.StatusCode)
	}

	var info struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
		VerifiedEmail bool   `json:"verified_email"`
	}
	if err := json.NewDecoder(infoResp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %w", err)
	}

	name := info.Name
	if name == "" {
		name = strings.Split(info.Email, "@")[0]
	}

	var picture *string
	if info.Picture != "" {
		picture = &info.Picture
	}

	return &GoogleUser{
		GoogleID:      info.ID,
		Email:         info.Email,
		Name:          name,
		Picture:       picture,
		EmailVerified: info.VerifiedEmail,
	}, nil
}
