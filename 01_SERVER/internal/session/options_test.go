package session

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestApplySessionOptionsSetsSessionDefaults(t *testing.T) {
	runner := &fakeRunner{}
	manager := New("tmux", "/bin/sh", runner)
	if err := manager.applySessionOptions(context.Background(), "alpha"); err != nil {
		t.Fatalf("applySessionOptions returned error: %v", err)
	}
	joined := []string{}
	for _, call := range runner.calls {
		joined = append(joined, strings.Join(call.args, " "))
	}
	want := []string{
		"set-option -q -t alpha status off",
		"set-option -q -t alpha mouse on",
		"set-window-option -q -t alpha history-limit 50000",
	}
	if strings.Join(joined, "|") != strings.Join(want, "|") {
		t.Fatalf("unexpected commands: %#v", joined)
	}
}

func TestApplySessionOptionsMapsMissingSession(t *testing.T) {
	runner := &fakeRunner{queue: []runnerResult{{output: []byte("can't find session: alpha"), err: errors.New("exit 1")}}}
	manager := New("tmux", "/bin/sh", runner)
	if err := manager.applySessionOptions(context.Background(), "alpha"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}
