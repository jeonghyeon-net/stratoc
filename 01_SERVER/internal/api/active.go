package api

func (registry *registry) active(name string) bool {
	registry.mutex.Lock()
	defer registry.mutex.Unlock()
	_, ok := registry.entries[name]
	return ok
}
