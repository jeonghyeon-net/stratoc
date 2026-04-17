package app

import (
	"os"
	"path/filepath"
)

func ensureTLSFiles(certPath string, keyPath string) {
	if fileExists(certPath) && fileExists(keyPath) {
		return
	}
	_ = os.MkdirAll(filepath.Dir(certPath), 0o700)
	_ = writeSelfSignedCertificate(certPath, keyPath)
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
