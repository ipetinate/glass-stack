package main

import (
	"log"

	"github.com/ipetinate/glass-stack/backend/internal/app"
)

func main() {
	application := app.New()

	if err := application.Run(); err != nil {
		log.Fatal(err)
	}
}
