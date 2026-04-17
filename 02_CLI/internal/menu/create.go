package menu

import (
	"context"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"
)

func (menu *Menu) createSession(ctx context.Context, state *state) (string, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	created := ""
	err := menu.withSessionClient(ctx, state, func(client *remote.Client) error {
		name, err := client.Create(ctx, remote.CreateRequest{})
		if !remote.IsInvalidSessionName(err) {
			created = name
			return err
		}
		created, err = client.Create(ctx, remote.CreateRequest{Name: nextSessionName(state.Sessions)})
		return err
	})
	return created, err
}
