package utils

import (
	"path/filepath"
	"runtime"
	"testing"
)

func FindRepositoryRootPath(t *testing.T) string {
	t.Helper()

	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller(0) failed")
	}

	rootPath, err := filepath.Abs(filepath.Join(filepath.Dir(file), "..", "..", ".."))
	if err != nil {
		t.Fatalf("resolve repository root path: %v", err)
	}

	return rootPath
}
