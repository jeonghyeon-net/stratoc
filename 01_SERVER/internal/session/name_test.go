package session

import (
	"errors"
	"strings"
	"testing"
)

func TestValidateNameRejectsUnsafeNames(t *testing.T) {
	invalidNames := []string{"", " bad", "../oops", "semi;colon", strings.Repeat("a", 65)}
	for _, name := range invalidNames {
		if err := ValidateName(name); !errors.Is(err, ErrInvalidName) {
			t.Fatalf("expected invalid error for %q, got %v", name, err)
		}
	}
	if err := ValidateName("alpha-1.ok"); err != nil {
		t.Fatalf("expected valid name, got %v", err)
	}
}
