package session

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestCreateBuildsDetachedCommand(t *testing.T) {
	runner := &fakeRunner{}
	manager := New("tmux", "/bin/zsh", runner)
	name, err := manager.Create(context.Background(), CreateRequest{Name: "alpha", WorkingDirectory: "/tmp/work"})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if name != "alpha" {
		t.Fatalf("unexpected name: %s", name)
	}
	joined := strings.Join(runner.calls[0].args, " ")
	if joined != "new-session -d -s alpha -c /tmp/work /bin/zsh" {
		t.Fatalf("unexpected tmux args: %s", joined)
	}
	want := []string{
		"set-option -q -t alpha status off",
		"set-option -q -t alpha mouse on",
		"set-window-option -q -t alpha history-limit 50000",
	}
	got := []string{}
	for _, call := range runner.calls[1:] {
		got = append(got, strings.Join(call.args, " "))
	}
	if strings.Join(got, "|") != strings.Join(want, "|") {
		t.Fatalf("session options not applied: %#v", got)
	}
}

func TestCreateMapsDuplicateError(t *testing.T) {
	runner := &fakeRunner{queue: []runnerResult{{output: []byte("duplicate session: alpha"), err: errors.New("exit 1")}}}
	manager := New("tmux", "/bin/sh", runner)
	if _, err := manager.Create(context.Background(), CreateRequest{Name: "alpha"}); !errors.Is(err, ErrExists) {
		t.Fatalf("expected ErrExists, got %v", err)
	}
}

func TestDeleteMapsMissingError(t *testing.T) {
	runner := &fakeRunner{queue: []runnerResult{{output: []byte("can't find session: alpha"), err: errors.New("exit 1")}}}
	manager := New("tmux", "/bin/sh", runner)
	if err := manager.Delete(context.Background(), "alpha"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}
