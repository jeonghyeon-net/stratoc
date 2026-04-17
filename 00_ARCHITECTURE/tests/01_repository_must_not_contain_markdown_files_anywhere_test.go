package tests

import (
	"io/fs"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/jeonghyeon-net/stratoc/00_ARCHITECTURE/internal/utils"
)

func TestRepositoryMustNotContainMarkdownFilesAnywhere(t *testing.T) {
	repositoryRootPath := utils.FindRepositoryRootPath(t)
	var markdownFiles []string

	err := filepath.WalkDir(repositoryRootPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() && d.Name() == ".git" {
			return filepath.SkipDir
		}

		if d.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(d.Name()))
		if ext != ".md" && ext != ".markdown" {
			return nil
		}

		relativePath, err := filepath.Rel(repositoryRootPath, path)
		if err != nil {
			return err
		}

		markdownFiles = append(markdownFiles, relativePath)
		return nil
	})
	if err != nil {
		t.Fatalf("walk repository: %v", err)
	}

	slices.Sort(markdownFiles)

	if len(markdownFiles) > 0 {
		t.Fatalf("markdown files forbidden in repository: %s", strings.Join(markdownFiles, ", "))
	}
}
