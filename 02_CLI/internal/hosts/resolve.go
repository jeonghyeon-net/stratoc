package hosts

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"sync"
)

const (
	maxResolvedPort    = 65535
	minResolvedPort    = 49152
	portResolveWorkers = 256
)

func (manager *Manager) Resolve(ctx context.Context, rawURL string) (string, error) {
	url := normalizeURL(rawURL)
	if hasExplicitPort(url) {
		return url, nil
	}
	return resolveCurrentURL(ctx, url)
}

func resolveCurrentURL(ctx context.Context, raw string) (string, error) {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Hostname() == "" {
		return "", fmt.Errorf("connection failed")
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	ports := make(chan int, portResolveWorkers)
	results := make(chan string, 1)
	var wait sync.WaitGroup
	for index := 0; index < portResolveWorkers; index++ {
		wait.Add(1)
		go resolveWorker(ctx, &wait, ports, results, parsed)
	}
	go feedPorts(ctx, ports)
	go func() { wait.Wait(); close(results) }()
	if resolved, ok := <-results; ok {
		return resolved, nil
	}
	return "", fmt.Errorf("connection failed")
}

func resolveWorker(ctx context.Context, wait *sync.WaitGroup, ports <-chan int, results chan<- string, parsed *url.URL) {
	defer wait.Done()
	for port := range ports {
		candidate := (&url.URL{Scheme: parsed.Scheme, Host: net.JoinHostPort(parsed.Hostname(), strconv.Itoa(port))}).String()
		if available(ctx, candidate) {
			select {
			case results <- candidate:
			default:
			}
			return
		}
	}
}

func feedPorts(ctx context.Context, ports chan<- int) {
	defer close(ports)
	for port := minResolvedPort; port <= maxResolvedPort; port++ {
		select {
		case <-ctx.Done():
			return
		case ports <- port:
		}
	}
}
