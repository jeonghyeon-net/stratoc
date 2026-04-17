package session

import (
	"context"
	"os"
	"strings"
	"testing"
)

func TestCreateUsesTrackedNameAndDefaults(t *testing.T) {
	runner := &fakeRunner{queue: []runnerResult{{output: []byte("session-0002\t0\t1\t1\tTerminal\tzsh\n")}}}
	manager := New("tmux", "/bin/zsh", runner)
	name, err := manager.Create(context.Background(), CreateRequest{})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if name != "session-0003" {
		t.Fatalf("unexpected name: %s", name)
	}
	home, _ := os.UserHomeDir()
	joined := strings.Join(runner.calls[1].args, " ")
	if joined != "new-session -d -s session-0003 -c "+home+" /bin/zsh" {
		t.Fatalf("unexpected tmux args: %s", joined)
	}
}
