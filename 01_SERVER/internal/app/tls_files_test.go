package app

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestManagedCertificateRefreshesLegacyEd25519(t *testing.T) {
	directory := t.TempDir()
	certPath := filepath.Join(directory, "host.crt")
	keyPath := filepath.Join(directory, "host.key")
	writeLegacyEd25519Certificate(t, certPath, keyPath)
	ensureTLSFiles(certPath, keyPath, true)
	certificate := readCertificate(t, certPath)
	if certificate.PublicKeyAlgorithm == x509.Ed25519 {
		t.Fatal("expected managed cert refresh away from ed25519")
	}
}

func TestExplicitCertificateDoesNotRefreshLegacyEd25519(t *testing.T) {
	directory := t.TempDir()
	certPath := filepath.Join(directory, "host.crt")
	keyPath := filepath.Join(directory, "host.key")
	writeLegacyEd25519Certificate(t, certPath, keyPath)
	ensureTLSFiles(certPath, keyPath, false)
	certificate := readCertificate(t, certPath)
	if certificate.PublicKeyAlgorithm != x509.Ed25519 {
		t.Fatal("expected explicit cert stay untouched")
	}
}

func writeLegacyEd25519Certificate(t *testing.T, certPath string, keyPath string) {
	t.Helper()
	_, key, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		t.Fatal(err)
	}
	template := &x509.Certificate{
		SerialNumber: serial,
		Subject: pkix.Name{CommonName: "legacy"},
		NotBefore: time.Now().Add(-time.Hour),
		NotAfter: time.Now().Add(time.Hour),
		KeyUsage: x509.KeyUsageDigitalSignature,
		ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}
	certDER, err := x509.CreateCertificate(rand.Reader, template, template, key.Public(), key)
	if err != nil {
		t.Fatal(err)
	}
	keyDER, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(certPath, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certDER}), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(keyPath, pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: keyDER}), 0o600); err != nil {
		t.Fatal(err)
	}
}

func readCertificate(t *testing.T, certPath string) *x509.Certificate {
	t.Helper()
	content, err := os.ReadFile(certPath)
	if err != nil {
		t.Fatal(err)
	}
	block, _ := pem.Decode(content)
	if block == nil {
		t.Fatal("missing pem block")
	}
	certificate, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		t.Fatal(err)
	}
	return certificate
}
