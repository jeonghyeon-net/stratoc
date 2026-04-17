package session

import (
	"context"
	"testing"
)

func TestAttachCommandDetachesExistingClients(t *testing.T) {
	runner := &fakeRunner{}
	manager := New("tmux", "/bin/sh", runner)
	command, err := manager.AttachCommand(context.Background(), "alpha")
	if err != nil {
		t.Fatalf("AttachCommand returned error: %v", err)
	}
	want := []string{"attach-session", "-d", "-t", "alpha"}
	for index := range want {
		if command.Args[index+1] != want[index] {
			t.Fatalf("unexpected arg %d: got=%q want=%q", index, command.Args[index+1], want[index])
		}
	}
}
