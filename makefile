.PHONY: test test-architecture

test: test-architecture

test-architecture:
	set -e; \
	cd 00_ARCHITECTURE; \
	go test -count=1 ./...
