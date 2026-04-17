package api

import "time"

const (
	coalesceWait    = 2 * time.Millisecond
	keepAlivePeriod = 30 * time.Second
	readLimitBytes  = 1 << 20
	readBufferBytes = 32 * 1024
	socketBuffer    = 256 * 1024
	maxFrameBytes   = 64 * 1024
	pongWait        = 60 * time.Second
	pingInterval    = 25 * time.Second
	writeWait       = 10 * time.Second
)
