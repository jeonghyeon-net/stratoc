package remote

import "testing"

func TestNewAddsHTTPPrefixWhenMissing(t *testing.T) {
	client, err := New("127.0.0.1:8080", "")
	if err != nil {
		t.Fatalf("New returned error: %v", err)
	}
	if got := client.baseURL.String(); got != "http://127.0.0.1:8080" {
		t.Fatalf("unexpected base url: %s", got)
	}
}

func TestNewRejectsRemoteHTTP(t *testing.T) {
	if _, err := New("http://10.0.0.2:8080", ""); err == nil {
		t.Fatal("expected remote http error")
	}
}
