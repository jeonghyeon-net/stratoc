package app

import (
	"context"
	"time"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/menu"
	"go.uber.org/fx"
)

type Application struct {
	fxApp *fx.App
	menu  *menu.Menu
}

func New(config Config) *Application {
	application := &Application{}
	application.fxApp = fx.New(
		fx.NopLogger,
		fx.Supply(config),
		fx.Provide(newHosts, newMenu),
		fx.Populate(&application.menu),
	)
	return application
}

func (application *Application) Err() error { return application.fxApp.Err() }

func (application *Application) Run() error {
	startCtx, startCancel := timeoutContext()
	defer startCancel()
	if err := application.fxApp.Start(startCtx); err != nil {
		return err
	}
	defer stopApplication(application.fxApp)
	return application.menu.Run()
}

func stopApplication(application *fx.App) {
	stopCtx, stopCancel := timeoutContext()
	defer stopCancel()
	_ = application.Stop(stopCtx)
}

func timeoutContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 5*time.Second)
}
