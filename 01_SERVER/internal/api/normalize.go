package api

import "github.com/jeonghyeon-net/stratoc/01_SERVER/internal/session"

func normalizeAttached(items []session.Item, registry *registry) []session.Item {
	out := append([]session.Item(nil), items...)
	for index := range out {
		if registry.active(out[index].Name) && out[index].Attached < 1 {
			out[index].Attached = 1
		}
	}
	return out
}
