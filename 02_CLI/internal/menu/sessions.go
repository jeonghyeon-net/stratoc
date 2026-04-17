package menu

import (
	"context"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/hosts"
	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/remote"
)

func (menu *Menu) loadSessions(ctx context.Context, host hosts.Item) ([]remote.Session, string, error) {
	client, err := menu.remoteClient(host)
	if err != nil {
		return nil, connectionFailedText, nil
	}
	sessions, err := client.List(ctx)
	if err == nil {
		return sessions, "", nil
	}
	if remote.IsUnauthorized(err) {
		if menu.hosts.HasToken(host.URL) {
			_ = menu.hosts.ClearToken(host.URL)
		}
		if remote.IsWrongAuthorizationToken(err) {
			return nil, authWrongTokenText, nil
		}
		return nil, authRequiredText, nil
	}
	return nil, connectionFailedText, nil
}
