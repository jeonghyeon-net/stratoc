package remote

import "time"

const (
	keepAlivePeriod = 30 * time.Second
	readBufferBytes = 32 * 1024
	socketBuffer    = 256 * 1024
	handshakeWait   = 5 * time.Second
)
