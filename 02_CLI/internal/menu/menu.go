package menu

import (
	"context"
	"os"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/hosts"
)

func New(hostsManager *hosts.Manager) *Menu {
	return &Menu{hosts: hostsManager, stdin: os.Stdin, stdout: os.Stdout, stderr: os.Stderr}
}

func (menu *Menu) Run() error {
	state, err := menu.refreshHosts(context.Background(), state{View: viewServers})
	if err != nil {
		return err
	}
	if err := menu.enterDashboard(); err != nil {
		return err
	}
	defer menu.leaveDashboard()
	for {
		menu.render(state)
		event, err := menu.readKey()
		if err != nil {
			return err
		}
		next, done, err := menu.applyKey(state, event)
		if err == errInterrupted {
			return nil
		}
		if err != nil {
			return err
		}
		if done {
			state, err = menu.handle(context.Background(), state, next)
			state = showError(state, err)
			continue
		}
		if applyMove(&state, event) {
			continue
		}
	}
}
