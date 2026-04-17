package app

import "strings"

func serveSecure(config Config) bool {
	return strings.TrimSpace(config.TLSCertPath) != "" && strings.TrimSpace(config.TLSKeyPath) != ""
}

func serveScheme(config Config) string {
	if serveSecure(config) {
		return "https"
	}
	return "http"
}
