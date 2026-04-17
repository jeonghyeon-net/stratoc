package hosts

import (
	"fmt"
	"net/url"
	"strings"
)

func normalizeURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if !strings.Contains(raw, "://") {
		raw = "https://" + raw
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" {
		return raw
	}
	parsed.Path = ""
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return parsed.String()
}

func labelFromURL(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" {
		return raw
	}
	return fmt.Sprintf("# %s", parsed.Host)
}
