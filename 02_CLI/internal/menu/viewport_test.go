package menu

import "testing"

func TestVisibleRange(t *testing.T) {
	start, end := visibleRange(100, 50, 10)
	if start != 45 || end != 55 {
		t.Fatalf("middle range = %d,%d", start, end)
	}
	start, end = visibleRange(100, 2, 10)
	if start != 0 || end != 10 {
		t.Fatalf("top range = %d,%d", start, end)
	}
	start, end = visibleRange(100, 98, 10)
	if start != 90 || end != 100 {
		t.Fatalf("bottom range = %d,%d", start, end)
	}
}

func TestClampIndex(t *testing.T) {
	if clampIndex(-1, 5) != 0 || clampIndex(99, 5) != 4 || clampIndex(2, 5) != 2 {
		t.Fatal("clampIndex failed")
	}
}
