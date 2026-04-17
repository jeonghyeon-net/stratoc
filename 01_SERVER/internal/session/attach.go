package session

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func (manager *Manager) AttachCommand(ctx context.Context, name string) (*exec.Cmd, error) {
	if err := manager.Has(ctx, name); err != nil {
		return nil, err
	}
	if err := manager.applySessionOptions(ctx, name); err != nil {
		return nil, err
	}
	command := exec.CommandContext(ctx, manager.binaryPath, "attach-session", "-d", "-t", name)
	command.Env = append(os.Environ(), "TERM=xterm-256color")
	return command, nil
}

func (manager *Manager) Has(ctx context.Context, name string) error {
	if err := ValidateName(name); err != nil {
		return err
	}
	output, err := manager.runner.Output(ctx, manager.binaryPath, "has-session", "-t", name)
	if err != nil {
		if hasMissing(output) || hasNoServer(output) {
			return ErrNotFound
		}
		return fmt.Errorf("check tmux session %q: %w: %s", name, err, strings.TrimSpace(string(output)))
	}
	return nil
}
