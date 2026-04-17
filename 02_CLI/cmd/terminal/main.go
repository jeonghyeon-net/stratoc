package main

import (
	"log"
	"os"

	"github.com/jeonghyeon-net/stratoc/02_CLI/internal/app"
)

func main() {
	application := app.New(app.Load(os.Args[1:]))
	if err := application.Err(); err != nil {
		log.Fatal(err)
	}
	if err := application.Run(); err != nil {
		log.Fatal(err)
	}
}
