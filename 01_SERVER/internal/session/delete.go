package session

import (
	"context"
	"fmt"
	"strings"
)

func (manager *Manager) Delete(ctx context.Context, name string) error {
	if err := ValidateName(name); err != nil {
		return err
	}
	output, err := manager.runner.Output(ctx, manager.binaryPath, "kill-session", "-t", name)
	if err != nil {
		if hasMissing(output) || hasNoServer(output) {
			return ErrNotFound
		}
		return fmt.Errorf("delete tmux session %q: %w: %s", name, err, strings.TrimSpace(string(output)))
	}
	return nil
}
