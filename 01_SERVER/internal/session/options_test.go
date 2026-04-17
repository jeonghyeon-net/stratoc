package session

import (
	"context"
	"errors"
	"testing"
)

func TestApplySessionOptionsHidesStatusBar(t *testing.T) {
	runner := &fakeRunner{}
	manager := New("tmux", "/bin/sh", runner)
	if err := manager.applySessionOptions(context.Background(), "alpha"); err != nil {
		t.Fatalf("applySessionOptions returned error: %v", err)
	}
	call := runner.calls[0]
	want := []string{"set-option", "-q", "-t", "alpha", "status", "off"}
	for index := range want {
		if call.args[index] != want[index] {
			t.Fatalf("unexpected arg %d: got=%q want=%q", index, call.args[index], want[index])
		}
	}
}

func TestApplySessionOptionsMapsMissingSession(t *testing.T) {
	runner := &fakeRunner{queue: []runnerResult{{output: []byte("can't find session: alpha"), err: errors.New("exit 1")}}}
	manager := New("tmux", "/bin/sh", runner)
	if err := manager.applySessionOptions(context.Background(), "alpha"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}
