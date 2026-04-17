package hosts

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"github.com/grandcat/zeroconf"
)

func discover(ctx context.Context, token string) ([]Item, error) {
	resolver, err := zeroconf.NewResolver(nil)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(ctx, 300*time.Millisecond)
	defer cancel()
	entries := make(chan *zeroconf.ServiceEntry)
	if err := resolver.Browse(ctx, serviceName, domainName, entries); err != nil {
		return nil, err
	}
	items := []Item{}
	for {
		select {
		case <-ctx.Done():
			return items, nil
		case entry, ok := <-entries:
			if !ok || entry == nil {
				return items, nil
			}
			for _, address := range entry.AddrIPv4 {
				url := (&url.URL{Scheme: "http", Host: fmt.Sprintf("%s:%d", address.String(), entry.Port)}).String()
				items = upsert(items, Item{Label: "# " + address.String(), Token: token, URL: url})
			}
		}
	}
}
