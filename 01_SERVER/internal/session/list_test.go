package session

import (
	"context"
	"errors"
	"testing"
)

func TestListParsesAndSorts(t *testing.T) {
	runner := &fakeRunner{queue: []runnerResult{{output: []byte("zeta\t0\t1\t1713300000\t\tlogs\nalpha\t2\t3\t1713200000\tTerminal A\teditor\n")}}}
	manager := New("tmux", "/bin/sh", runner)
	items, err := manager.List(context.Background())
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(items) != 2 || items[0].Name != "alpha" || items[1].Name != "zeta" {
		t.Fatalf("unexpected items: %#v", items)
	}
	if items[0].Attached != 2 || items[0].Windows != 3 || items[0].Title != "Terminal A" {
		t.Fatalf("unexpected item: %#v", items[0])
	}
	if items[1].Title != "logs" {
		t.Fatalf("unexpected item: %#v", items[0])
	}
}

func TestListTreatsNoServerAsEmpty(t *testing.T) {
	runner := &fakeRunner{queue: []runnerResult{{output: []byte("no server running on /tmp/default"), err: errors.New("exit 1")}}}
	manager := New("tmux", "/bin/sh", runner)
	items, err := manager.List(context.Background())
	if err != nil || len(items) != 0 {
		t.Fatalf("unexpected result: items=%#v err=%v", items, err)
	}
}

func TestListTreatsConnectionErrorAsEmpty(t *testing.T) {
	runner := &fakeRunner{queue: []runnerResult{{output: []byte("error connecting to /private/tmp/tmux-501/default (No such file or directory)"), err: errors.New("exit 1")}}}
	manager := New("tmux", "/bin/sh", runner)
	items, err := manager.List(context.Background())
	if err != nil || len(items) != 0 {
		t.Fatalf("unexpected result: items=%#v err=%v", items, err)
	}
}
