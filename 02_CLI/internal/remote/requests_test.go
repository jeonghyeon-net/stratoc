package remote

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientCreatesAndDeletesSessions(t *testing.T) {
	authHeader := ""
	server := httptest.NewTLSServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		authHeader = request.Header.Get("Authorization")
		switch request.Method + " " + request.URL.Path {
		case http.MethodGet + " /api/sessions":
			writer.Header().Set("Content-Type", "application/json")
			_, _ = writer.Write([]byte(`[{"name":"alpha","attached":0,"windows":1,"created_at":"2026-04-17T00:00:00Z"}]`))
		case http.MethodPost + " /api/sessions":
			writer.Header().Set("Content-Type", "application/json")
			writer.WriteHeader(http.StatusCreated)
			_, _ = writer.Write([]byte(`{"created":"alpha"}`))
		case http.MethodDelete + " /api/sessions/alpha":
			writer.WriteHeader(http.StatusOK)
		default:
			writer.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()
	client, err := New(server.URL, "secret")
	if err != nil {
		t.Fatalf("New returned error: %v", err)
	}
	items, err := client.List(context.Background())
	if err != nil || len(items) != 1 || items[0].Name != "alpha" {
		t.Fatalf("unexpected result: items=%#v err=%v", items, err)
	}
	name, err := client.Create(context.Background(), CreateRequest{Name: "alpha"})
	if err != nil || name != "alpha" {
		t.Fatalf("Create returned name=%q err=%v", name, err)
	}
	if err := client.Delete(context.Background(), "alpha"); err != nil {
		t.Fatalf("Delete returned error: %v", err)
	}
	if authHeader != "Bearer secret" {
		t.Fatalf("expected auth header, got %q", authHeader)
	}
}
