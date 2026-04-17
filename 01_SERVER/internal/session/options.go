package session

import (
	"context"
	"fmt"
	"strings"
)

func (manager *Manager) applySessionOptions(ctx context.Context, name string) error {
	for _, arguments := range sessionOptions(name) {
		output, err := manager.runner.Output(ctx, manager.binaryPath, arguments...)
		if err == nil {
			continue
		}
		if hasMissing(output) || hasNoServer(output) {
			return ErrNotFound
		}
		return fmt.Errorf("set tmux options for %q: %w: %s", name, err, strings.TrimSpace(string(output)))
	}
	return nil
}

func sessionOptions(name string) [][]string {
	return [][]string{
		{"set-option", "-q", "-t", name, "status", "off"},
		{"set-option", "-q", "-t", name, "mouse", "on"},
		{"set-window-option", "-q", "-t", name, "history-limit", "50000"},
	}
}
