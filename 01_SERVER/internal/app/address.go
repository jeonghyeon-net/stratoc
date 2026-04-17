package app

import (
	"fmt"
	"net"
	"strconv"
	"strings"
)

func listenHost(address string) string {
	address = strings.TrimSpace(address)
	if address == "" {
		return ""
	}
	if host, _, err := net.SplitHostPort(address); err == nil {
		return host
	}
	if strings.Count(address, ":") == 1 {
		parts := strings.Split(address, ":")
		return parts[0]
	}
	return address
}

func listenAddress(host string, port int) string {
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
