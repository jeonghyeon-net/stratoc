package app

import "net"

const defaultHostPort = 62589

func newListener(config Config) (net.Listener, error) {
	return net.Listen("tcp", listenAddress(listenHost(config.Address), defaultHostPort))
}
