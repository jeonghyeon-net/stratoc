package api

import "sync"

type registry struct {
	mutex   sync.Mutex
	nextID  uint64
	entries map[string]lease
}

type lease struct {
	id    uint64
	close func(string)
}

func newRegistry() *registry {
	return &registry{entries: map[string]lease{}}
}

func (registry *registry) put(name string, close func(string)) (func(), func()) {
	registry.mutex.Lock()
	defer registry.mutex.Unlock()
	registry.nextID++
	current := lease{registry.nextID, close}
	previous, exists := registry.entries[name]
	registry.entries[name] = current
	return func() {
			if exists && previous.close != nil {
				previous.close("replaced by newer connection")
			}
		}, func() {
			registry.mutex.Lock()
			defer registry.mutex.Unlock()
			active, ok := registry.entries[name]
			if ok && active.id == current.id {
				delete(registry.entries, name)
			}
		}
}
