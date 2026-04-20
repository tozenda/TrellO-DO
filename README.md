# TrellO-DO

Personal initiative board for local use.

## Stack

- React 18 + Ant Design
- Vite for the frontend build
- local Node HTTP server
- TypeScript across frontend, shared state, and server modules
- Vitest + React Testing Library for regression coverage

## What it does

- initiative swimlanes
- drag cards across columns and between initiatives
- card priorities and notes
- local persistence to disk
- optional Claude CLI-backed task generation

## Scripts

Install dependencies:

```bash
npm install
```

Run the local web app in development:

```bash
npm run dev
```

Build the frontend and typed server output:

```bash
npm run build
```

Run the production-style local server:

```bash
npm start
```

Run the test suite:

```bash
npm test
```

The local app runs on `http://127.0.0.1:3000`.

## Data storage

The app persists local state in:

- `data/workspace.json`
- `data/claude-debug.log`

## Claude task generation

Claude integration is optional and uses the locally installed `claude` CLI.

Requirements:

```bash
claude
```

Then complete `/login` in Terminal once.

If Claude is unavailable or not logged in, the rest of the app still works.

## Structure

- `server/`: typed local backend, HTTP routes, static serving, Claude integration
- `src/app/`: app shell and theme
- `src/features/`: feature-first UI modules
- `src/shared/`: shared types, state helpers, utilities, and API client
- `src/styles/`: split CSS by responsibility
