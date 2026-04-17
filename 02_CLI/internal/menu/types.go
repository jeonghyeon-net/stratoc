package menu

import (
	"os"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/hosts"
	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"
	"golang.org/x/term"
)

const (
	authRequiredText     = "(authorization required)"
	authWrongTokenText   = "(wrong authorization token)"
	connectionFailedText = "(connection failed)"
	viewServers          = "servers"
	viewSessions         = "sessions"
)

type Menu struct {
	hosts    *hosts.Manager
	rawState *term.State
	stdin    *os.File
	stdout   *os.File
	stderr   *os.File
}

type state struct {
	HostError  string
	HostIndex  int
	Hosts      []hosts.Item
	SessionErr string
	SessionIdx int
	Sessions   []remote.Session
	View       string
}

type action struct{ Kind string }

type message struct {
	Type    string `json:"type"`
	Reason  string `json:"reason,omitempty"`
	Columns uint16 `json:"columns,omitempty"`
	Rows    uint16 `json:"rows,omitempty"`
}
