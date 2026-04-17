package app

import (
	"os"
	"path/filepath"
	"strings"
)

const authTokenFileSubpath = ".config/stratoc/auth_token"

func resolveAuthorizationToken(token string) string {
	token = strings.TrimSpace(token)
	if token != "" {
		return token
	}
	if token, err := readAuthorizationToken(); err == nil && token != "" {
		return token
	}
	token = defaultAuthorizationToken()
	_ = writeAuthorizationToken(token)
	return token
}

func readAuthorizationToken() (string, error) {
	path, err := authorizationTokenPath()
	if err != nil {
		return "", err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(data)), nil
}

func writeAuthorizationToken(token string) error {
	path, err := authorizationTokenPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(token+"\n"), 0o600)
}

func authorizationTokenPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "auth_token", err
	}
	return filepath.Join(home, authTokenFileSubpath), nil
}
