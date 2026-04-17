package menu

import "time"

const (
	readLimitBytes = 1 << 20
	pongWait       = 60 * time.Second
	pingInterval   = 25 * time.Second
	writeWait      = 10 * time.Second
)
