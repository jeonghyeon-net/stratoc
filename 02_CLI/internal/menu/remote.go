package menu

import (
	"context"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/hosts"
	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"
)

func (menu *Menu) remoteClient(ctx context.Context, host hosts.Item) (*remote.Client, error) {
	url, err := menu.hosts.Resolve(ctx, host.URL)
	if err != nil {
		return nil, err
	}
	return remote.New(url, host.Token)
}
