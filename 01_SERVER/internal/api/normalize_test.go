package api

import (
	"testing"

	"github.com/jeonghyeon-net/stratoc/01_SERVER/internal/session"
)

func TestNormalizeAttachedPreservesTmuxClientsAndAppClients(t *testing.T) {
	registry := newRegistry()
	_, unregister := registry.put("alpha", nil)
	defer unregister()
	items := []session.Item{{Name: "alpha", Attached: 0}, {Name: "beta", Attached: 2}}
	normalized := normalizeAttached(items, registry)
	if normalized[0].Attached != 1 || normalized[1].Attached != 2 {
		t.Fatalf("unexpected attached values: %#v", normalized)
	}
	if items[0].Attached != 0 || items[1].Attached != 2 {
		t.Fatalf("input mutated: %#v", items)
	}
}
