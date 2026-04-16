# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Run dev server at http://127.0.0.1:3000 (Node + Vite HMR)
npm run build    # Production build via Vite
```

No test or lint scripts are configured.

## Architecture

**Full-stack JS app**: React frontend served by a Node.js HTTP server that also exposes a REST API and integrates Vite's dev middleware for HMR.

### Backend (`server.js`)
Single-file Node HTTP server on port 3000 with three API routes:
- `GET /PUT /api/workspace` — reads/writes `data/workspace.json` (all app state)
- `POST /api/ai/generate-tasks` — spawns a `claude` CLI subprocess to generate task suggestions as JSON

The Claude CLI binary is resolved via `CLAUDE_BIN` env var or PATH. Timeout defaults to 180s (`CLAUDE_TIMEOUT_MS` to override). Debug output goes to `data/claude-debug.log`.

### Frontend (`src/`)
- **`App.jsx`** (~1,700 lines): The entire frontend application. Manages initiative swimlanes, cards (Backlog / In Progress / Done columns), drag-and-drop, priority system (p0–p3), card memory notes, activity log, and AI task generation modals.
- **`main.jsx`**: Mounts React with Ant Design theming.
- **`styles.css`**: All custom CSS (~11,700 lines).

### State & Persistence
- React state in `App.jsx` is the single source of truth.
- On mount: `GET /api/workspace` loads state from disk.
- On every state change: `PUT /api/workspace` fires with a 180ms debounce.
- Theme preference persists in `localStorage`.
- Persisted data: initiatives, cards (with column, priority, memory notes), active initiative ID, and 12 most recent activity entries.

### AI Task Generation Flow
Frontend POSTs a context description → server spawns Claude CLI with a structured prompt and JSON schema → server parses and returns 4–12 task suggestions → frontend shows a review/import modal.
