package menu

import (
	"context"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"
)

func (menu *Menu) openHost(ctx context.Context, state state) (state, error) {
	host, ok := state.host()
	if !ok {
		return state, nil
	}
	sessions, status, err := menu.loadSessions(ctx, host)
	if err != nil {
		return state, err
	}
	if needsAuthorization(status) {
		host, err = menu.authorize(host)
		if err != nil {
			return state, err
		}
		sessions, status, err = menu.loadSessions(ctx, host)
		if err != nil {
			return state, err
		}
	}
	if status != "" {
		state.HostError = status
		state.View = viewServers
		return state, nil
	}
	state.setHost(host)
	state.HostError = ""
	state.SessionErr = ""
	state.SessionIdx = 0
	state.Sessions = sessions
	state.View = viewSessions
	return state, nil
}

func needsAuthorization(status string) bool {
	return status == authRequiredText || status == authWrongTokenText
}

func (menu *Menu) connectSession(ctx context.Context, state *state) error {
	if len(state.Sessions) == 0 || state.SessionIdx >= len(state.Sessions) {
		return nil
	}
	name := state.Sessions[state.SessionIdx].Name
	return menu.withSessionClient(ctx, state, func(client *remote.Client) error {
		return menu.attach(ctx, client, name)
	})
}
