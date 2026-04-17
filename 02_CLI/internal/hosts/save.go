package hosts

import (
	"encoding/json"
	"os"
	"path/filepath"
)

func saveFile(value fileData) error {
	path := storePath()
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}
