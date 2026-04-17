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
	if [ -d cmd/host ]; then \
		go build -o host ./cmd/host; \
	elif [ -d cmd/server ]; then \
		go build -o host ./cmd/server; \
	elif [ -d cmd/stratoc-server ]; then \
		go build -o host ./cmd/stratoc-server; \
	else \
		echo "missing host command package under 01_SERVER/cmd" >&2; \
		exit 1; \
	fi

build-terminal:
	set -e; \
	cd 02_CLI; \
	if [ -d cmd/terminal ]; then \
		go build -o terminal ./cmd/terminal; \
	elif [ -d cmd/stc ]; then \
		go build -o terminal ./cmd/stc; \
	else \
		echo "missing terminal command package under 02_CLI/cmd" >&2; \
		exit 1; \
	fi
