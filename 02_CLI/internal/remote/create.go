package remote

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

func (client *Client) Create(ctx context.Context, requestBody CreateRequest) (string, error) {
	body, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("encode create request: %w", err)
	}
	request, err := client.newRequest(ctx, http.MethodPost, "/api/sessions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := client.httpClient.Do(request)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()
	if err := expectStatus(response, http.StatusCreated); err != nil {
		return "", err
	}
	payload := map[string]string{}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return "", fmt.Errorf("decode create response: %w", err)
	}
	return payload["created"], nil
}
