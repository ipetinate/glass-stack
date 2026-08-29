<div align="center">
  <img src="./docs/images/glass-stack.png" alt="Glass Stack" width="256" />
</div>

<h1 align="center">Glass Stack</h1>

<p align="center">
  <em>Server management, made transparent</em>
</p>

---

<div align="center">
  <a href="https://github.com/ipetinate/glass-stack/actions"><img src="https://github.com/ipetinate/glass-stack/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/ipetinate/glass-stack/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ipetinate/glass-stack" alt="License"></a>
  <a href="https://github.com/ipetinate/glass-stack/releases"><img src="https://img.shields.io/github/v/release/ipetinate/glass-stack" alt="Release"></a>
  <a href="https://github.com/ipetinate/glass-stack/stargazers"><img src="https://img.shields.io/github/stars/ipetinate/glass-stack" alt="Stars"></a>
</div>

---

## About

The Glass Stack backend is the core API server that powers the platform. Written in Go, it exposes a REST API for managing Docker containers, monitoring system resources, browsing files, and providing terminal access to the host machine.

It uses SQLite for lightweight, zero-configuration data persistence and Server-Sent Events (SSE) for real-time communication between the server and the frontend.

### Features

- **App Manager** — Install, start, stop, and remove Docker containers through the API.
- **System Monitor** — CPU, memory, disk, network, and temperature metrics in real time.
- **File Manager API** — Browse, upload, edit, and delete files on the server.
- **Terminal API** — Execute shell commands and stream output via WebSocket or SSE.
- **SSE Events** — Real-time push updates for system state and container events.

## How to Run

### Prerequisites

- [Go](https://go.dev/) (v1.26 or later)
- [Docker](https://www.docker.com/) (running and accessible)
- [SQLite](https://www.sqlite.org/) (usually bundled with Go via `mattn/go-sqlite3`)

### Environment Setup

1. **Clone the repository**

```bash
git clone https://github.com/ipetinate/glass-stack.git
cd glass-stack/backend
```

2. **Install dependencies**

```bash
go mod download
```

3. **Ensure Docker is running**

```bash
docker info
```

If this command fails, start Docker Desktop or the Docker daemon on your system.

4. **Run the development stack**

Run the backend and frontend in separate terminals.

```bash
cd backend
cp .env.example .env
go tool air -c .air.toml
```

In another terminal:

```bash
pnpm --dir frontend dev
```

The frontend is available at `http://localhost:8080` and proxies `/api` to
the backend at `http://localhost:8070`. Vite provides HMR for the frontend and
Air rebuilds the backend whenever Go files change.

On first start, the backend logs the path of a mode-0600 bootstrap-token file
and the onboarding URL. Read the token locally and enter it when the onboarding
screen requests it; the token itself is never written to ordinary logs.

Key configuration:

- `GLASS_DATA_DIR` controls the SQLite, secrets, media and backup root.
- `GLASS_PUBLIC_URL` controls the browser-facing onboarding URL.
- `GLASS_ALLOWED_ORIGINS` lists comma-separated trusted frontend origins.
- `GLASS_PASSWORD_COMPROMISE_MODE` selects `hybrid` (default) or `local`
  compromised-password checks. Hybrid mode sends only a padded five-character
  SHA-1 prefix to the free HIBP Pwned Passwords range API; local checking
  always remains active.
- `GLASS_UNSPLASH_ACCESS_KEY` stays server-side and enables wallpaper search.
- `GLASS_UNSPLASH_SELF_HOST=true` stores provider image bytes only when the
  deployment has compatible rights; the default API mode hotlinks Unsplash.

In development, the backend reads `backend/.env` without overriding variables
already exported by the shell. This file is ignored by Git. Production does
not load a local environment file.

To run only the backend directly:

```bash
go tool air -c .air.toml
```

The API will be available at `http://localhost:8070`.

### System monitoring endpoints

`GET /api/events?interval=1` opens an SSE stream. `interval` accepts values from
1 to 5 seconds and defaults to 1. The stream emits `temperature`, `cpu`, `gpu`,
and `io` events. CPU events contain overall and per-core utilization; GPU
events contain `usagePercent` when the operating system exposes a supported
counter, otherwise the value is `null`.

`GET /api/host` returns a fixed JSON snapshot with hostname, operating system,
kernel, architecture, CPU model/core details, total memory, and best-effort GPU
hardware information.

### Build

```bash
go build -o glassd ./cmd/glassd
```

### Run Tests

```bash
go test ./...
```

## Stack

- **Language**
  - [Go](https://go.dev/)
- **HTTP Server**
  - [net/std](https://pkg.go.dev/net/http)
- **Database**
  - [SQLite](https://www.sqlite.org/)
- **Container Management**
  - [Docker Engine API](https://docs.docker.com/engine/api/)
- **Real-time Events**
  - Server-Sent Events (SSE)
- **System Monitoring**
  - Host metrics via Go syscalls

## Useful Links

- [Figma](https://www.figma.com/files/team/1656792652117448309/all-projects)
- [GitHub Issues](https://github.com/ipetinate/glass-stack/issues)
