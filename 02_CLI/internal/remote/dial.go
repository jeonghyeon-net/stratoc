package remote

import (
	"context"
	"crypto/tls"
	"net/http"
	"net/url"

	"github.com/gorilla/websocket"
)

func (client *Client) Dial(ctx context.Context, name string, headers http.Header) (*websocket.Conn, *http.Response, error) {
	if headers == nil {
		headers = make(http.Header)
	}
	if client.authToken != "" {
		headers.Set("Authorization", "Bearer "+client.authToken)
	}
	websocketURL := *client.baseURL
	if websocketURL.Scheme == "https" {
		websocketURL.Scheme = "wss"
	} else {
		websocketURL.Scheme = "ws"
	}
	websocketURL.Path = "/api/sessions/" + url.PathEscape(name) + "/attach"
	dialer := websocket.Dialer{
		EnableCompression: false,
		HandshakeTimeout:  handshakeWait,
		ReadBufferSize:    readBufferBytes,
		WriteBufferSize:   readBufferBytes,
		WriteBufferPool:   websocketBufferPool,
		TLSClientConfig:   &tls.Config{InsecureSkipVerify: true},
	}
	connection, response, err := dialer.DialContext(ctx, websocketURL.String(), headers)
	if err == nil {
		tuneNetConnection(connection.UnderlyingConn())
		connection.EnableWriteCompression(false)
	}
	return connection, response, err
}
