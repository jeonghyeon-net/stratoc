package app

import (
	"net"
	"net/http"
	"os/exec"
	"time"

	"github.com/jeonghyeon-net/stratoc/01_SERVER/internal/api"
	"github.com/jeonghyeon-net/stratoc/01_SERVER/internal/lan"
	"github.com/jeonghyeon-net/stratoc/01_SERVER/internal/session"
)

func newHandler(config Config, manager *session.Manager) http.Handler {
	return api.New(manager, config.AuthToken).Handler()
}

func newHost(handler http.Handler) *http.Server {
	return &http.Server{
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       30 * time.Second,
	}
}

func newSessionManager(config Config) (*session.Manager, error) {
	if _, err := exec.LookPath(config.TmuxBinaryPath); err != nil {
		return nil, err
	}
	return session.New(config.TmuxBinaryPath, config.DefaultShellPath, nil), nil
}

func newAnnouncer(listener net.Listener) *lan.Announcer {
	return lan.New(lan.ParsePort(listener.Addr().String()))
}
