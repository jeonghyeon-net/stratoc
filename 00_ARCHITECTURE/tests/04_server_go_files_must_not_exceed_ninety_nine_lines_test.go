package tests

import (
	"fmt"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/jeonghyeon-net/stratoc/00_ARCHITECTURE/utils"
)

func TestServerGoFilesMustNotExceedNinetyNineLines(t *testing.T) {
	repositoryRootPath := utils.FindRepositoryRootPath(t)
	goFiles := utils.ListGoFilesInDirectory(t, repositoryRootPath, "01_SERVER")
	tooLong := []string{}
	for _, relativePath := range goFiles {
		lineCount := utils.CountFileLines(t, filepath.Join(repositoryRootPath, relativePath))
		if lineCount > 99 {
			tooLong = append(tooLong, fmt.Sprintf("%s=%d", relativePath, lineCount))
		}
	}
	slices.Sort(tooLong)
	if len(tooLong) > 0 {
		t.Fatalf("server go files must stay at 99 lines max: %s", strings.Join(tooLong, ", "))
	}
}
