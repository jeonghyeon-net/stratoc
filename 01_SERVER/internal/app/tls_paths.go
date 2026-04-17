package app

import (
	"os"
	"path/filepath"
	"strings"
)

const tlsDirectorySubpath = ".config/stratoc-host/tls"

func ensureTLSConfig(config Config) Config {
	config.TLSCertPath, config.TLSKeyPath = tlsPaths(config)
	ensureTLSFiles(config.TLSCertPath, config.TLSKeyPath)
	return config
}

func tlsPaths(config Config) (string, string) {
	if strings.TrimSpace(config.TLSCertPath) != "" && strings.TrimSpace(config.TLSKeyPath) != "" {
		return config.TLSCertPath, config.TLSKeyPath
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "tls.crt", "tls.key"
	}
	directory := filepath.Join(home, tlsDirectorySubpath)
	return filepath.Join(directory, "host.crt"), filepath.Join(directory, "host.key")
}
