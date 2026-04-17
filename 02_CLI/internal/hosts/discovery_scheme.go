package hosts

import "strings"

func schemeFromText(items []string) string {
	for _, item := range items {
		if strings.HasPrefix(item, "scheme=https") {
			return "https"
		}
	}
	return ""
}
