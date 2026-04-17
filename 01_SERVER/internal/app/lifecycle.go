package app

import (
	"context"
	"fmt"
	"net"
	"net/http"

	"github.com/jeonghyeon-net/stratoc/01_SERVER/internal/lan"
	"go.uber.org/fx"
)

func registerLifecycle(lifecycle fx.Lifecycle, config Config, host *http.Server, listener net.Listener, announcer *lan.Announcer) {
	lifecycle.Append(fx.Hook{
		OnStart: func(context.Context) error {
			fmt.Printf("auth token: %s\n", config.AuthToken)
			_ = announcer.Start()
			go serveHost(config, host, listener)
			return nil
		},
		OnStop: func(ctx context.Context) error {
			announcer.Stop()
			return host.Shutdown(ctx)
		},
	})
}

func serveHost(config Config, host *http.Server, listener net.Listener) {
	_ = host.ServeTLS(listener, config.TLSCertPath, config.TLSKeyPath)
}
