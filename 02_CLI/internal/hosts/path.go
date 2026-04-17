package hosts

import (
	"os"
	"path/filepath"
)

func storePath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return storeSubpath
	}
	return filepath.Join(home, storeSubpath)
}
