package app

import (
	"fmt"
	"net"
	"strconv"
	"strings"
)

func splitAddress(address string) (string, int) {
	if host, port, err := net.SplitHostPort(address); err == nil {
		value, _ := strconv.Atoi(port)
		return host, value
	}
	parts := strings.Split(address, ":")
	if len(parts) == 2 {
		value, _ := strconv.Atoi(parts[1])
		return parts[0], value
	}
	return strings.TrimSpace(address), 0
}

func listenAddress(host string, port int) string {
	if port < 1 {
		return host
	}
	if host == "" {
		return fmt.Sprintf(":%d", port)
	}
	return net.JoinHostPort(host, strconv.Itoa(port))
}

func loopbackHost(host string) bool {
	host = strings.Trim(host, "[]")
	if host == "" || host == "localhost" {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func localURL(listener net.Listener, scheme string) string {
	tcp, _ := listener.Addr().(*net.TCPAddr)
	port := 0
	if tcp != nil {
		port = tcp.Port
	}
	if port < 1 {
		return ""
	}
	return fmt.Sprintf("%s://127.0.0.1:%d", scheme, port)
}
