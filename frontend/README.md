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

The Glass Stack frontend is a modern single-page application built with React and TypeScript. It provides the user interface for managing servers, browsing files, accessing a terminal, and installing applications — all through a responsive, desktop-like experience in the browser.

The UI is designed with a modular architecture, where each feature (Dashboard, File Manager, Terminal, Applications Store, Settings) lives in its own module with dedicated routes, pages, and components.

### Features

- **Dashboard** — Real-time overview of server status, resources, and running services.
- **Applications Store** — Install, update, and remove Docker-based applications with a few clicks.
- **File Manager** — Browse, upload, edit, and manage files directly from the browser.
- **Terminal** — Full shell access to your server without leaving the interface.
- **Settings** — Customize appearance, themes, wallpapers, and system preferences.

## How to Run

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/)

### Installation

```bash
cd frontend
pnpm install
```

### Development

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`.

### Build

```bash
pnpm build
```

### Lint

```bash
pnpm lint
```

### Tests

```bash
pnpm test
```

## Stack

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [React Router](https://reactrouter.com/)
- [Lucide React](https://lucide.dev/)
- [Framer Motion](https://www.framer.com/motion/)
- [D3.js](https://d3js.org/)
- [Vitest](https://vitest.dev/)
- [OxLint](https://oxc.rs/docs/guide/usage/linter)

## Useful Links

- [Figma](https://www.figma.com/files/team/1656792652117448309/all-projects)
- [GitHub Issues](https://github.com/ipetinate/glass-stack/issues)
