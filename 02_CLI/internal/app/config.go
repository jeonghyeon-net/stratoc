package app

import (
	"flag"
	"os"
	"strings"
)

type Config struct {
	AuthToken string
	ServerURL string
}

func Load(args []string) Config {
	values := loadDotEnv()
	flags := flag.NewFlagSet("terminal", flag.ExitOnError)
	config := Config{}
	flags.StringVar(&config.AuthToken, "auth-token", env(values, "TERMINAL_AUTH_TOKEN", env(values, "AUTHORIZATION_TOKEN", "")), "bearer token")
	flags.StringVar(
		&config.ServerURL,
		"server-url",
		env(values, "TERMINAL_SERVER_URL", ""),
		"remote server url",
	)
	_ = flags.Parse(args)
	return config
}

func env(values map[string]string, key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value != "" {
		return value
	}
	if value = strings.TrimSpace(values[key]); value != "" {
		return value
	}
	return fallback
}
