package menu

import "testing"

func TestParseMouseEvent(t *testing.T) {
	cases := map[string]string{
		"[<64;20;10M": "up",
		"[<65;20;10M": "down",
		"[<0;20;10M":  "",
	}
	for input, want := range cases {
		if got := parseMouseEvent(input); got != want {
			t.Fatalf("parseMouseEvent(%q)=%q want=%q", input, got, want)
		}
	}
}

func TestFinalEscapeByte(t *testing.T) {
	if !finalEscapeByte('A') || !finalEscapeByte('m') || !finalEscapeByte('~') {
		t.Fatal("expected final escape byte")
	}
	if finalEscapeByte('1') || finalEscapeByte(';') {
		t.Fatal("unexpected final escape byte")
	}
}
