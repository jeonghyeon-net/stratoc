package hosts

func upsert(items []Item, item Item) []Item {
	url := normalizeURL(item.URL)
	for index := range items {
		if normalizeURL(items[index].URL) == url {
			items[index] = item
			return items
		}
	}
	return append(items, item)
}

func removeURL(items []Item, rawURL string) []Item {
	out := []Item{}
	url := normalizeURL(rawURL)
	for _, item := range items {
		if normalizeURL(item.URL) != url {
			out = append(out, item)
		}
	}
	return out
}
