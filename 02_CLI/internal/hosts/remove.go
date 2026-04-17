package hosts

func (manager *Manager) Remove(url string) error {
	value, err := loadFile()
	if err != nil {
		return err
	}
	normalized := normalizeURL(url)
	value.Servers = removeURL(value.Servers, normalized)
	delete(value.Tokens, normalized)
	return saveFile(value)
}
