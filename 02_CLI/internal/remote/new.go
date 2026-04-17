package remote

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

func New(rawBaseURL string, authToken string) (*Client, error) {
	if rawBaseURL == "" {
		rawBaseURL = "http://127.0.0.1:8080"
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
	return &Client{parsedBaseURL, strings.TrimSpace(authToken), &http.Client{}}, nil
}
