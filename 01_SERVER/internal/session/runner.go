package session

import (
	"context"
	"os/exec"
)

type Runner interface {
	Output(ctx context.Context, name string, args ...string) ([]byte, error)
}

type ProcessRunner struct{}

func (ProcessRunner) Output(ctx context.Context, name string, args ...string) ([]byte, error) {
	command := exec.CommandContext(ctx, name, args...)
	return command.CombinedOutput()
}
