.PHONY: test build clean test-architecture test-host test-terminal build-host build-terminal

test: test-architecture test-host test-terminal

build: build-host build-terminal

clean:
	rm -f 01_SERVER/host 02_CLI/terminal

test-architecture:
	set -e; \
	cd 00_ARCHITECTURE; \
	go test -count=1 ./...

test-host:
	set -e; \
	cd 01_SERVER; \
	go test -count=1 ./...

test-terminal:
	set -e; \
	cd 02_CLI; \
	go test -count=1 ./...

build-host:
	set -e; \
	cd 01_SERVER; \
	go build ./cmd/host

build-terminal:
	set -e; \
	cd 02_CLI; \
	go build ./cmd/terminal
