# Community guidance

Use this as supporting guidance, not as a rigid framework mandate. Go does not
have one universally accepted application layout. Prefer the smallest layout
that clearly communicates ownership and dependency direction.

## Go project organization

- The official Go guidance supports packages under `internal/` and command
  entrypoints under `cmd/` when a module contains an application and supporting
  packages.
- The community `golang-standards/project-layout` repository is a useful
  collection of patterns, but it explicitly is not an official Go standard.
  Do not add every directory from it automatically.
- Avoid `pkg/` for private application code. Use it only for a deliberate,
  supported external library surface.
- Avoid excessive package fragmentation. A cohesive package with a small API is
  preferable to many one-file packages created for theoretical layering.

## Idiomatic Go

- Use package names that are short, lowercase, and behavior-oriented; avoid
  `util`, `common`, and redundant names such as `httpserver/http`.
- Keep interfaces small and define them where they are consumed. Concrete types
  are the default; abstractions should protect a boundary or enable a focused
  test.
- Accept contexts at I/O boundaries and propagate cancellation. Do not use
  context values as a substitute for explicit function parameters.
- Add operation context when wrapping errors. Preserve classification with
  `errors.Is`/`errors.As` when callers need it.
- Prefer explicit ownership of goroutines and channels. Every goroutine needs a
  cancellation path, cleanup policy, and a testable shutdown behavior.

## Quality and tooling

- `gofmt` is mandatory for Go source.
- `go vet` is a baseline check.
- `staticcheck` is a commonly adopted community check when available; treat
  findings as design feedback, not merely lint noise.
- Run race detection for shared state and event/concurrency code.
- Prefer standard-library tests, table-driven cases, fakes at domain
  boundaries, and `httptest` for HTTP behavior.
- Keep platform-specific behavior behind adapters and test parsing and mapping
  independently from the live host.

## Sources

- Go, “Organizing a Go module”: https://go.dev/doc/modules/layout
- Go, “Organizing Go code”: https://go.dev/blog/organizing-go-code
- Go community project layout (explicitly non-official):
  https://github.com/golang-standards/project-layout
- Go Code Review Comments: https://go.dev/wiki/CodeReviewComments
