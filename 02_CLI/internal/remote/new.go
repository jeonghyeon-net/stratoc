package remote

import (
	"fmt"
	"net/url"
	"strings"
)

func New(rawBaseURL string, authToken string) (*Client, error) {
	if strings.TrimSpace(rawBaseURL) == "" {
		return nil, fmt.Errorf("base url missing")
	}
	if !strings.Contains(rawBaseURL, "://") {
		rawBaseURL = "http://" + rawBaseURL
	}
	parsedBaseURL, err := url.Parse(rawBaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse base url: %w", err)
	}
	if parsedBaseURL.Host == "" {
		return nil, fmt.Errorf("base url missing host: %q", rawBaseURL)
	}
	if parsedBaseURL.Scheme == "http" && !loopbackHost(parsedBaseURL.Hostname()) {
		return nil, fmt.Errorf("https required for remote hosts: %q", rawBaseURL)
	}
	return &Client{parsedBaseURL, strings.TrimSpace(authToken), newHTTPClient()}, nil
}
