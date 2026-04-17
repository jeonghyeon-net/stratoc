package hosts

import "strings"

func New(defaultURL string, defaultToken string) *Manager {
	return &Manager{defaultToken: strings.TrimSpace(defaultToken), defaultURL: normalizeURL(defaultURL)}
}
