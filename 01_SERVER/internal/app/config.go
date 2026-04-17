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
	TLSCertPath      string
	TLSKeyPath       string
	TmuxBinaryPath   string
}

func Load(args []string) Config {
	flags := flag.NewFlagSet("host", flag.ExitOnError)
	config := Config{}
	flags.StringVar(&config.Address, "address", env("HOST_ADDRESS", ""), "listen host")
	flags.StringVar(&config.AuthToken, "auth-token", env("HOST_AUTH_TOKEN", env("AUTHORIZATION_TOKEN", "")), "bearer token")
	flags.StringVar(&config.DefaultShellPath, "default-shell-path", env("HOST_DEFAULT_SHELL_PATH", os.Getenv("SHELL")), "default shell path")
	flags.StringVar(&config.TLSCertPath, "tls-cert-path", env("HOST_TLS_CERT_PATH", ""), "tls certificate path")
	flags.StringVar(&config.TLSKeyPath, "tls-key-path", env("HOST_TLS_KEY_PATH", ""), "tls private key path")
	flags.StringVar(&config.TmuxBinaryPath, "tmux-binary-path", env("HOST_TMUX_BINARY_PATH", "tmux"), "tmux binary path")
	_ = flags.Parse(args)
	config.AuthToken = resolveAuthorizationToken(config.AuthToken)
	return ensureTLSConfig(config)
}

func env(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value != "" {
		return value
	}
	return fallback
}
