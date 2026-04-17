package menu

import (
	"net/http"
	"os"
	"strconv"

	"golang.org/x/term"
)

func terminalHeaders(output *os.File) (http.Header, bool) {
	headers := http.Header{}
	width, height, err := term.GetSize(int(output.Fd()))
	if err != nil || width < 1 || height < 1 {
		return headers, false
	}
	headers.Set("X-Terminal-Columns", strconv.Itoa(width))
	headers.Set("X-Terminal-Rows", strconv.Itoa(height))
	return headers, true
}
