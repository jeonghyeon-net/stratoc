package menu

import (
	"context"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"
)

func (menu *Menu) withSessionClient(
	ctx context.Context,
	state *state,
	run func(*remote.Client) error,
) error {
	host, ok := state.host()
	if !ok {
		return nil
	}
	client, err := menu.remoteClient(ctx, host)
	if err != nil {
		return err
	}
	err = run(client)
	if !remote.IsUnauthorized(err) {
		return err
	}
	_ = menu.hosts.ClearToken(host.URL)
	state.clearHostToken()
	host, err = menu.authorize(host)
	if err != nil {
		return err
	}
	state.setHost(host)
	client, err = menu.remoteClient(ctx, host)
	if err != nil {
		return err
	}
	return run(client)
}
