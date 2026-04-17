package menu

import (
	"context"
	"time"
)

const requestTimeout = 5 * time.Second

func timeoutContext(ctx context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(ctx, requestTimeout)
}
