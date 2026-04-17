package app

import "go.uber.org/fx"

func New(config Config) *fx.App {
	return fx.New(
		fx.NopLogger,
		fx.Supply(config),
		fx.Provide(
			newAnnouncer,
			newHandler,
			newHost,
			newListener,
			newSessionManager,
		),
		fx.Invoke(registerLifecycle),
	)
}
