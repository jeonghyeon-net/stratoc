package tests

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/jeonghyeon-net/stratoc/00_ARCHITECTURE/utils"
)

func TestArchitectureTestFilesMustNotExceedNinetyNineLines(t *testing.T) {
	repositoryRootPath := utils.FindRepositoryRootPath(t)
	files, err := filepath.Glob(filepath.Join(repositoryRootPath, "00_ARCHITECTURE", "tests", "*_test.go"))
	if err != nil {
		t.Fatalf("glob architecture test files: %v", err)
	}
	if len(files) == 0 {
		t.Fatal("no architecture test files found")
	}

	var tooLong []string
	for _, path := range files {
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read test file %q: %v", path, err)
		}

		lineCount := bytes.Count(data, []byte{'\n'})
		if len(data) > 0 && data[len(data)-1] != '\n' {
			lineCount++
		}
		if lineCount <= 99 {
			continue
		}

		relativePath, err := filepath.Rel(repositoryRootPath, path)
		if err != nil {
			t.Fatalf("relative path for %q: %v", path, err)
		}
		tooLong = append(tooLong, fmt.Sprintf("%s=%d", relativePath, lineCount))
	}

	slices.Sort(tooLong)
	if len(tooLong) > 0 {
		t.Fatalf("architecture test files must stay at 99 lines max: %s", strings.Join(tooLong, ", "))
	}
}
