package hosts

import "testing"

func TestNormalizeURLUsesDefaultPort(t *testing.T) {
	if got := normalizeURL("100.112.242.31"); got != "https://100.112.242.31:62589" {
		t.Fatalf("unexpected url: %s", got)
	}
	if got := normalizeURL("https://100.112.242.31:4443"); got != "https://100.112.242.31:62589" {
		t.Fatalf("unexpected explicit port: %s", got)
	}
}

func TestLabelFromURLHidesPort(t *testing.T) {
	if got := labelFromURL("https://100.112.242.31:62589"); got != "# 100.112.242.31" {
		t.Fatalf("unexpected label: %s", got)
	}
}
