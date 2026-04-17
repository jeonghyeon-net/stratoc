package app

import "net"

const defaultHostPort = 62589

func newListener(config Config) (net.Listener, error) {
	host, port := splitAddress(config.Address)
	if port < 1 {
		port = defaultHostPort
	}
	return net.Listen("tcp", listenAddress(host, port))
}
