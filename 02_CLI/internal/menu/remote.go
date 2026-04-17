package menu

import (
	"context"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/hosts"
	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"
)

func (menu *Menu) remoteClient(_ context.Context, host hosts.Item) (*remote.Client, error) {
	return remote.New(host.URL, host.Token)
}
