package app

import (
	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/hosts"
	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/menu"
)

func newHosts(config Config) *hosts.Manager {
	return hosts.New(config.ServerURL, config.AuthToken)
}

func newMenu(hostsManager *hosts.Manager) *menu.Menu {
	return menu.New(hostsManager)
}
