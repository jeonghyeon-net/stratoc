package hosts

import "testing"

func TestNormalizeURLKeepsMissingPort(t *testing.T) {
	if got := normalizeURL("100.112.242.31"); got != "https://100.112.242.31" {
		t.Fatalf("unexpected url: %s", got)
	}
	if !hasExplicitPort("https://100.112.242.31:4443") {
		t.Fatal("expected explicit port")
	}
	if hasExplicitPort("https://100.112.242.31") {
		t.Fatal("unexpected explicit port")
	}
}
