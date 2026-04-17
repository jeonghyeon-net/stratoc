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
			if err := writeHostState(listener, serveScheme(config)); err != nil {
				log.Printf("write host state failed: %v", err)
			}
			if serveSecure(config) {
				if err := announcer.Start(); err != nil {
					log.Printf("lan announce disabled: %v", err)
				}
			} else {
				log.Printf("lan announce disabled: https required")
			}
			log.Printf("host listening on %s", listener.Addr().String())
			go serveHost(config, host, listener)
			return nil
		},
		OnStop: func(ctx context.Context) error {
			announcer.Stop()
			removeHostState()
			return host.Shutdown(ctx)
		},
	})
}

func serveHost(config Config, host *http.Server, listener net.Listener) {
	var err error
	if serveSecure(config) {
		err = host.ServeTLS(listener, config.TLSCertPath, config.TLSKeyPath)
	} else {
		err = host.Serve(listener)
	}
	if err != nil && err != http.ErrServerClosed {
		log.Printf("host stopped: %v", err)
	}
}
