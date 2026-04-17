package app

import (
	"flag"
	"os"
	"strings"
)

type Config struct {
	Address          string
	AuthToken        string
	DefaultShellPath string
	TmuxBinaryPath   string
}

func Load(args []string) Config {
	values := loadDotEnv()
	flags := flag.NewFlagSet("host", flag.ExitOnError)
	config := Config{}
	flags.StringVar(&config.Address, "address", env(values, "HOST_ADDRESS", ""), "listen address")
	flags.StringVar(&config.AuthToken, "auth-token", env(values, "HOST_AUTH_TOKEN", env(values, "AUTHORIZATION_TOKEN", "")), "bearer token")
	flags.StringVar(
		&config.DefaultShellPath,
		"default-shell-path",
		env(values, "HOST_DEFAULT_SHELL_PATH", os.Getenv("SHELL")),
		"default shell path",
	)
	flags.StringVar(
		&config.TmuxBinaryPath,
		"tmux-binary-path",
		env(values, "HOST_TMUX_BINARY_PATH", "tmux"),
		"tmux binary path",
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
