package api

import "testing"

func TestRegistryDropsPreviousConnection(t *testing.T) {
	registry := newRegistry()
	closed := []string{}
	_, forgetFirst := registry.put("alpha", func(reason string) { closed = append(closed, "first:"+reason) })
	dropFirst, forgetSecond := registry.put("alpha", func(reason string) { closed = append(closed, "second:"+reason) })
	dropFirst()
	if len(closed) != 1 || closed[0] != "first:replaced by newer connection" {
		t.Fatalf("unexpected close calls: %#v", closed)
	}
	forgetFirst()
	dropSecond, forgetThird := registry.put("alpha", nil)
	dropSecond()
	if len(closed) != 2 || closed[1] != "second:replaced by newer connection" {
		t.Fatalf("unexpected close calls: %#v", closed)
	}
	forgetSecond()
	forgetThird()
	if _, forget := registry.put("alpha", nil); forget == nil {
		t.Fatal("expected unregister function")
	}
}
