# PlanMe

A keyboard-first task management desktop app with Markdown rendering and optional self-hosted sync.

## Features

- **Inline Markdown rendering** — headings, bold, strikethrough, checkboxes render as you type via CodeMirror 6
- **Keyboard-first** — move lines with `Alt+↑/↓`, command palette, no mouse required
- **Sticker mode** — always-on-top, click-through, transparent overlay for keeping tasks visible
- **Self-hosted sync** — optional Hono server syncs your notes across devices over your own infrastructure
- **Local-first** — works fully offline; sync is opt-in

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop | Tauri 2 + React |
| Editor | CodeMirror 6 |
| Sync Server | Hono + Node.js |
| Database | SQLite (better-sqlite3) |
| Monorepo | pnpm + Turborepo |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 9
- [Rust](https://rustup.rs/) (for Tauri)

### Development

```bash
pnpm install

# Desktop app
pnpm desktop:dev

# Sync server only
pnpm server:dev
```

### Build

```bash
pnpm build
```

## Self-Hosted Sync Server

### Docker (recommended)

```bash
cd apps/server
docker compose up -d
```

The server starts on port `3847` by default. Data is persisted in a Docker volume.

### One-line deploy (Linux)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Resistill/PlanMe/main/planme.sh) install
```

After install, manage with:

```bash
planme start | stop | restart | status | log | update | uninstall
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PLANME_PORT` | `3847` | Server listen port |
| `PLANME_DATA_DIR` | `/opt/planme/data` | SQLite data directory |

## License

[MIT](LICENSE)
