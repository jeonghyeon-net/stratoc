package menu

import (
	"context"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"
)

func (menu *Menu) removeSession(ctx context.Context, state *state) error {
	if len(state.Sessions) == 0 || state.SessionIdx >= len(state.Sessions) {
		return nil
	}
	name := state.Sessions[state.SessionIdx].Name
	return menu.withSessionClient(ctx, state, func(client *remote.Client) error {
		return client.Delete(ctx, name)
	})
}
