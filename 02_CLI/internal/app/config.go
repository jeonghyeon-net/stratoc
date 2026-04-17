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
	flags := flag.NewFlagSet("terminal", flag.ExitOnError)
	config := Config{}
	flags.StringVar(&config.AuthToken, "auth-token", env("TERMINAL_AUTH_TOKEN", ""), "bearer token")
	flags.StringVar(&config.ServerURL, "server-url", env("TERMINAL_SERVER_URL", ""), "remote server url")
	_ = flags.Parse(args)
	return config
}

func env(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value != "" {
		return value
	}
	return fallback
}
