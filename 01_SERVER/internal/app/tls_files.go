package app

import (
	"crypto/x509"
	"encoding/pem"
	"os"
	"path/filepath"
)

func ensureTLSFiles(certPath string, keyPath string, managed bool) {
	if fileExists(certPath) && fileExists(keyPath) && !shouldRefreshManagedCertificate(certPath, managed) {
		return
	}
	_ = os.MkdirAll(filepath.Dir(certPath), 0o700)
	_ = writeSelfSignedCertificate(certPath, keyPath)
}

func shouldRefreshManagedCertificate(certPath string, managed bool) bool {
	if !managed {
		return false
	}
	content, err := os.ReadFile(certPath)
	if err != nil {
		return false
	}
	block, _ := pem.Decode(content)
	if block == nil {
		return false
	}
	certificate, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return false
	}
	return certificate.PublicKeyAlgorithm == x509.Ed25519 || certificate.SignatureAlgorithm == x509.PureEd25519
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
