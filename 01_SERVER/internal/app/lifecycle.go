package app

import (
	"context"
	"log"
	"net"
	"net/http"

	"github.com/jeonghyeon-net/stratoc/01_SERVER/internal/lan"
	"go.uber.org/fx"
)

func registerLifecycle(lifecycle fx.Lifecycle, config Config, host *http.Server, listener net.Listener, announcer *lan.Announcer) {
	lifecycle.Append(fx.Hook{
		OnStart: func(context.Context) error {
			if err := announcer.Start(); err != nil {
				log.Printf("lan announce disabled: %v", err)
			}
			log.Printf("host listening on %s", listener.Addr().String())
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
	err := host.ServeTLS(listener, config.TLSCertPath, config.TLSKeyPath)
	if err != nil && err != http.ErrServerClosed {
		log.Printf("host stopped: %v", err)
	}
}
