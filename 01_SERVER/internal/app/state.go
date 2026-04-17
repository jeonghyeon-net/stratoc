package app

import (
	"encoding/json"
	"net"
	"os"
	"path/filepath"
)

const hostStateSubpath = ".config/terminal-share/host.json"

type hostState struct {
	URL string `json:"url"`
}

func writeHostState(listener net.Listener) error {
	path, err := hostStatePath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	data, err := json.Marshal(hostState{URL: localURL(listener)})
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

func removeHostState() {
	path, err := hostStatePath()
	if err == nil {
		_ = os.Remove(path)
	}
}

func hostStatePath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, hostStateSubpath), nil
}
