package session

import (
	"context"
	"testing"
)

func TestNextNameUsesHighestTrackedSession(t *testing.T) {
	runner := &fakeRunner{queue: []runnerResult{{output: []byte("session-0002\t0\t1\t1\tTerminal\tzsh\nsession-0010\t0\t1\t1\tEditor\teditor\nmanual\t0\t1\t1\tLogs\tlogs\n")}}}
	manager := New("tmux", "/bin/sh", runner)
	name, err := manager.nextName(context.Background())
	if err != nil {
		t.Fatalf("nextName returned error: %v", err)
	}
	if name != "session-0011" {
		t.Fatalf("unexpected name: %s", name)
	}
}
