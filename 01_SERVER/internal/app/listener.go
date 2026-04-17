package app

import (
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"net"
)

const (
	maxRandomPort = 65535
	minRandomPort = 49152
	portTries     = 64
)

func newListener(config Config) (net.Listener, error) {
	host, port := splitAddress(config.Address)
	if !serveSecure(config) {
		if host == "" {
			host = "127.0.0.1"
		}
		if !loopbackHost(host) {
			return nil, fmt.Errorf("https required for non-loopback host: %s", host)
		}
	}
	if port > 0 {
		return net.Listen("tcp", listenAddress(host, port))
	}
	for try := 0; try < portTries; try++ {
		listener, err := net.Listen("tcp", listenAddress(host, randomPort()))
		if err == nil {
			return listener, nil
		}
	}
	return nil, fmt.Errorf("find open port in %d-%d", minRandomPort, maxRandomPort)
}

func randomPort() int {
	buffer := make([]byte, 2)
	if _, err := rand.Read(buffer); err != nil {
		return minRandomPort
	}
	span := maxRandomPort - minRandomPort + 1
	return minRandomPort + int(binary.BigEndian.Uint16(buffer))%span
}
