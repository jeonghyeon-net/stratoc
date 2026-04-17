package lan

import (
	"net"
	"strconv"
	"strings"
)

func ParsePort(address string) int {
	_, port, err := net.SplitHostPort(address)
	if err == nil {
		value, _ := strconv.Atoi(port)
		return value
	}
	parts := strings.Split(address, ":")
	if len(parts) == 0 {
		return 0
	}
	value, _ := strconv.Atoi(parts[len(parts)-1])
	return value
}
