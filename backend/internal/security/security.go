package security

import (
	"fmt"
	"strconv"
	"time"

	"github.com/alexedwards/argon2id"
	"github.com/golang-jwt/jwt/v5"

	"triequest-backend/internal/config"
)

func HashPassword(password string) (string, error) {
	return argon2id.CreateHash(password, argon2id.DefaultParams)
}

func VerifyPassword(password, hash string) (bool, error) {
	return argon2id.ComparePasswordAndHash(password, hash)
}

func CreateAccessToken(userID int, cfg *config.Settings) (string, error) {
	now := time.Now().UTC()
	claims := jwt.MapClaims{
		"sub":  strconv.Itoa(userID),
		"type": "access",
		"iss":  cfg.TokenIssuer,
		"iat":  now.Unix(),
		"nbf":  now.Unix(),
		"exp":  now.Add(time.Duration(cfg.AccessTokenExpireMinutes) * time.Minute).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.SecretKey))
}

func DecodeAccessToken(tokenStr string, cfg *config.Settings) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(cfg.SecretKey), nil
	},
		jwt.WithIssuer(cfg.TokenIssuer),
		jwt.WithValidMethods([]string{"HS256"}),
	)

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	requiredFields := []string{"sub", "type", "iss", "iat", "nbf", "exp"}
	for _, field := range requiredFields {
		if _, exists := claims[field]; !exists {
			return nil, fmt.Errorf("missing required claim: %s", field)
		}
	}

	return claims, nil
}
