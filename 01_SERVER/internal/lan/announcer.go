package lan

import (
	"os"

	"github.com/grandcat/zeroconf"
)

type Announcer struct {
	name   string
	port   int
	server *zeroconf.Server
}

func New(port int) *Announcer {
	name, err := os.Hostname()
	if err != nil || name == "" {
		name = "host"
	}
	return &Announcer{name: name, port: port}
}

func (announcer *Announcer) Start() error {
	if announcer.port < 1 {
		return nil
	}
	server, err := zeroconf.Register(announcer.name, serviceName, domainName, announcer.port, nil, nil)
	if err != nil {
		return err
	}
	announcer.server = server
	return nil
}

func (announcer *Announcer) Stop() {
	if announcer.server != nil {
		announcer.server.Shutdown()
	}
}
