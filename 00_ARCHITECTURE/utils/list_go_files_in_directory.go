package utils

import (
	"io/fs"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

func ListGoFilesInDirectory(t *testing.T, rootPath string, relativeDirectory string) []string {
	t.Helper()
	targetPath := filepath.Join(rootPath, relativeDirectory)
	paths := []string{}
	err := filepath.WalkDir(targetPath, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		if filepath.Ext(entry.Name()) != ".go" {
			return nil
		}
		relativePath, err := filepath.Rel(rootPath, path)
		if err != nil {
			return err
		}
		paths = append(paths, strings.ReplaceAll(relativePath, "\\", "/"))
		return nil
	})
	if err != nil {
		t.Fatalf("walk %s: %v", relativeDirectory, err)
	}
	slices.Sort(paths)
	return paths
}
