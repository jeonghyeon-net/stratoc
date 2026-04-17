package utils

import (
	"fmt"
	"os/exec"
	"path/filepath"
)

func IsGitIgnored(repositoryRootPath string, path string) (bool, error) {
	relativePath, err := filepath.Rel(repositoryRootPath, path)
	if err != nil {
		return false, err
	}
	command := exec.Command("git", "-C", repositoryRootPath, "check-ignore", "-q", relativePath)
	err = command.Run()
	if err == nil {
		return true, nil
	}
	if exitError, ok := err.(*exec.ExitError); ok && exitError.ExitCode() == 1 {
		return false, nil
	}
	return false, fmt.Errorf("git check-ignore %q: %w", relativePath, err)
}
