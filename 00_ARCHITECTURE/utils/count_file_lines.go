package utils

import (
	"bytes"
	"os"
	"testing"
)

func CountFileLines(t *testing.T, path string) int {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read file %q: %v", path, err)
	}
	lineCount := bytes.Count(data, []byte{'\n'})
	if len(data) > 0 && data[len(data)-1] != '\n' {
		lineCount++
	}
	return lineCount
}
