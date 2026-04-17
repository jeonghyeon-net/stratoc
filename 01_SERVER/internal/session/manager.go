package session

import (
	"fmt"
	"os"
	"regexp"
)

var namePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`)

type Manager struct {
	binaryPath              string
	defaultShellPath        string
	defaultWorkingDirectory string
	runner                  Runner
}

func New(binaryPath string, defaultShellPath string, runner Runner) *Manager {
	if binaryPath == "" {
		binaryPath = "tmux"
	}
	if defaultShellPath == "" {
		defaultShellPath = os.Getenv("SHELL")
	}
	if defaultShellPath == "" {
		defaultShellPath = "/bin/sh"
	}
	defaultWorkingDirectory, err := os.UserHomeDir()
	if err != nil || defaultWorkingDirectory == "" {
		defaultWorkingDirectory = os.Getenv("HOME")
	}
	if runner == nil {
		runner = ProcessRunner{}
	}
	return &Manager{binaryPath, defaultShellPath, defaultWorkingDirectory, runner}
}

func ValidateName(name string) error {
	if namePattern.MatchString(name) {
		return nil
	}
	return fmt.Errorf("%w: %q", ErrInvalidName, name)
}
