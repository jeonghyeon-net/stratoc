package session

import (
	"context"
	"fmt"
	"strings"
)

func (manager *Manager) applySessionOptions(ctx context.Context, name string) error {
	arguments := []string{"set-option", "-q", "-t", name, "status", "off"}
	output, err := manager.runner.Output(ctx, manager.binaryPath, arguments...)
	if err == nil {
		return nil
	}
	if hasMissing(output) || hasNoServer(output) {
		return ErrNotFound
	}
	return fmt.Errorf("set tmux options for %q: %w: %s", name, err, strings.TrimSpace(string(output)))
}
