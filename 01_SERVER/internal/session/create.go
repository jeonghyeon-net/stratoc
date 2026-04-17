package session

import (
	"context"
	"fmt"
	"strings"
)

func (manager *Manager) Create(ctx context.Context, request CreateRequest) (string, error) {
	name, err := manager.createName(ctx, request.Name)
	if err != nil {
		return "", err
	}
	arguments := []string{"new-session", "-d", "-s", name}
	workingDirectory := manager.defaultWorkingDirectory
	if request.WorkingDirectory != "" {
		workingDirectory = request.WorkingDirectory
	}
	if workingDirectory != "" {
		arguments = append(arguments, "-c", workingDirectory)
	}
	shellPath := manager.defaultShellPath
	if request.ShellPath != "" {
		shellPath = request.ShellPath
	}
	arguments = append(arguments, shellPath)
	output, err := manager.runner.Output(ctx, manager.binaryPath, arguments...)
	if err != nil {
		if hasDuplicate(output) {
			return "", ErrExists
		}
		return "", fmt.Errorf("create tmux session %q: %w: %s", name, err, strings.TrimSpace(string(output)))
	}
	return name, manager.applySessionOptions(ctx, name)
}
