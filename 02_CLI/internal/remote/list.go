package remote

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

func (client *Client) List(ctx context.Context) ([]Session, error) {
	request, err := client.newRequest(ctx, http.MethodGet, "/api/sessions", nil)
	if err != nil {
		return nil, err
	}
	response, err := client.httpClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if err := expectStatus(response, http.StatusOK); err != nil {
		return nil, err
	}
	sessions := []Session{}
	if err := json.NewDecoder(response.Body).Decode(&sessions); err != nil {
		return nil, fmt.Errorf("decode sessions: %w", err)
	}
	return sessions, nil
}
