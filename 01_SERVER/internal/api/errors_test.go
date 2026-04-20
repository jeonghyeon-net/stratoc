package api

import (
	"fmt"
	"net"
	"os"
	"syscall"
	"testing"
)

func TestIsExpectedClose(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{name: "nil", err: nil, want: true},
		{name: "eof", err: fmt.Errorf("wrap: %w", os.ErrClosed), want: true},
		{name: "net closed", err: fmt.Errorf("wrap: %w", net.ErrClosed), want: true},
		{name: "broken pipe", err: fmt.Errorf("wrap: %w", syscall.EPIPE), want: true},
		{name: "conn reset", err: fmt.Errorf("wrap: %w", syscall.ECONNRESET), want: true},
		{name: "other", err: fmt.Errorf("boom"), want: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := isExpectedClose(test.err)
			if got != test.want {
				t.Fatalf("isExpectedClose(%v) = %v, want %v", test.err, got, test.want)
			}
		})
	}
}
