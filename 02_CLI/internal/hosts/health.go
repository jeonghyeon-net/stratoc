package hosts

import (
	"context"
	"crypto/tls"
	"net"
	"net/http"
	"strings"
	"time"
)

func available(ctx context.Context, rawURL string) bool {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(rawURL, "/")+"/healthz", nil)
	if err != nil {
		return false
	}
	client := &http.Client{
		Timeout: 150 * time.Millisecond,
		Transport: &http.Transport{
			DialContext:           (&net.Dialer{Timeout: 150 * time.Millisecond}).DialContext,
			TLSClientConfig:       &tls.Config{InsecureSkipVerify: true},
			TLSHandshakeTimeout:   150 * time.Millisecond,
			ResponseHeaderTimeout: 150 * time.Millisecond,
		},
	}
	response, err := client.Do(request)
	if err != nil {
		return false
	}
	defer response.Body.Close()
	return response.StatusCode == http.StatusOK
}
