package remote

import (
	"crypto/tls"
	"net"
	"net/http"
	"time"
)

func newHTTPClient() *http.Client {
	transport := &http.Transport{
		DialContext:           (&net.Dialer{Timeout: 5 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
		ResponseHeaderTimeout: 5 * time.Second,
		TLSClientConfig:       &tls.Config{InsecureSkipVerify: true},
		TLSHandshakeTimeout:   5 * time.Second,
	}
	return &http.Client{Timeout: 5 * time.Second, Transport: transport}
}
