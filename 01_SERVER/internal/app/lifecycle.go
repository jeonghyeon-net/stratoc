package app

import (
	"context"
	"log"
	"net"
	"net/http"

	"github.com/jeonghyeon-net/stratoc/01_SERVER/internal/lan"
	"go.uber.org/fx"
)

func registerLifecycle(lifecycle fx.Lifecycle, host *http.Server, listener net.Listener, announcer *lan.Announcer) {
	lifecycle.Append(fx.Hook{
		OnStart: func(context.Context) error {
			if err := writeHostState(listener); err != nil {
				log.Printf("write host state failed: %v", err)
			}
			if err := announcer.Start(); err != nil {
				log.Printf("lan announce disabled: %v", err)
			}
			log.Printf("host listening on %s", listener.Addr().String())
			go func() {
				if err := host.Serve(listener); err != nil && err != http.ErrServerClosed {
					log.Printf("host stopped: %v", err)
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			announcer.Stop()
			removeHostState()
			return host.Shutdown(ctx)
		},
	})
}
