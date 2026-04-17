package tests

import (
	"fmt"
	"os"
	"slices"
	"strings"
	"testing"

	"github.com/jeonghyeon-net/stratoc/00_ARCHITECTURE/utils"
)

func TestRepositoryRootEntriesMustMatchCurrentExpectedFilesAndDirectories(t *testing.T) {
	repositoryRootPath := utils.FindRepositoryRootPath(t)
	entries, err := os.ReadDir(repositoryRootPath)
	if err != nil {
		t.Fatalf("read repository root directory: %v", err)
	}

	expectedEntries := []string{
		".claude:dir",
		".mise.toml:file",
		"00_ARCHITECTURE:dir",
		"01_SERVER:dir",
		"02_CLI:dir",
		"03_ANDROID:dir",
		"04_IOS:dir",
		"README:file",
		"lefthook.yml:file",
		"makefile:file",
	}

	var actualEntries []string
	for _, entry := range entries {
		if entry.Name() == ".git" {
			continue
		}
		entryType := "file"
		if entry.IsDir() {
			entryType = "dir"
		}
		actualEntries = append(actualEntries, fmt.Sprintf("%s:%s", entry.Name(), entryType))
	}

	slices.Sort(expectedEntries)
	slices.Sort(actualEntries)
	if slices.Equal(actualEntries, expectedEntries) {
		return
	}

	t.Fatalf(
		"repository root entries changed\nexpected: %s\nactual: %s",
		strings.Join(expectedEntries, ", "),
		strings.Join(actualEntries, ", "),
	)
}
