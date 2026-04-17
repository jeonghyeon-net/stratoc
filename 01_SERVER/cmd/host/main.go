package main

import (
	"log"
	"os"

	"github.com/jeonghyeon-net/stratoc/01_SERVER/internal/app"
)

func main() {
	application := app.New(app.Load(os.Args[1:]))
	if err := application.Err(); err != nil {
		log.Fatal(err)
	}
	application.Run()
}
