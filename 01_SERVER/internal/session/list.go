package session

import (
	"context"
	"fmt"
	"strings"
)

func (manager *Manager) List(ctx context.Context) ([]Item, error) {
	output, err := manager.runner.Output(
		ctx,
		manager.binaryPath,
		"list-sessions",
		"-F",
		"#{session_name}\t#{session_attached}\t#{session_windows}\t#{session_created}\t#{pane_title}\t#{window_name}",
	)
	if err != nil {
		if hasNoServer(output) {
			return nil, nil
		}
		return nil, fmt.Errorf("list tmux sessions: %w: %s", err, strings.TrimSpace(string(output)))
	}
	return parseList(output)
}
