# Trello-Do

A React + Ant Design work board centered on initiative swimlanes.

## Stack

- React
- Ant Design
- Vite

## What it does

- Organizes work by initiative.
- Uses sub-swimlanes for `Backlog`, `In Progress`, and `Done`.
- Supports drag-and-drop across both status lanes and initiative lanes.
- Persists workspace state to a local JSON file through a Node API.

## Run it

```bash
npm start
```

Then open `http://127.0.0.1:3000`.

## Build

```bash
npm run build
```

## Persistence model

The app persists:

- initiatives
- cards
- card memory/context notes
- the active initiative
- the 12 most recent activity entries

Data is stored on disk at `data/workspace.json`.

Theme preference still stays in browser `localStorage`.
