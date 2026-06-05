# workstream-tracker

A GUI tool for tracking many workstreams simultaneously, with automatic markdown export.

## Features

- **Strategies** — top-level color-coded groupings of related workstreams
- **Operations** — columnar workstream views within a strategy, each with a title and set of goals
- **Engagements** — individual tasks/activities within an operation, each with a status (Active / Blocked / Completed) and goal targets
- **Status summary** — automatically computed per-operation summary showing active, blocked, and completed engagement counts with a progress bar
- **Right-click context menus** — right-click any operation column or engagement card to edit or delete (long-press on touch)
- **Add/Edit dialogs** — modal dialogs for creating and editing strategies, operations, and engagements
- **Undo / Redo** — full undo/redo history (also Ctrl+Z / Ctrl+Y)
- **Auto-save** — state is automatically persisted to `localStorage` on every change
- **Markdown export** — export the full board as a human-readable markdown file
- **AI suggestions** — click "✨ AI Suggest" in the engagement dialog to auto-populate fields (defaults to GitHub Copilot; configurable)

## Getting Started

```bash
npm install
npm run dev        # development server
npm run build      # production build
npm run preview    # preview production build
npm run lint       # run ESLint
```

## AI Configuration

The AI backend is configured in `public/ai-config.json`:

```json
{
  "backend": "copilot",
  "copilot": { "model": "gpt-4o" },
  "custom": {
    "endpoint": "http://localhost:11434/api/generate",
    "model": "llama3"
  }
}
```

Set `"backend"` to `"copilot"` (GitHub Copilot) or `"custom"` (any OpenAI-compatible or Ollama endpoint).

## Data Format

State is persisted as JSON in `localStorage` (key: `workstream-tracker-state`) and can be exported as a markdown file using the **📄 Export MD** button.

## Tech Stack

- React 19 + TypeScript
- Vite
- Pure CSS (no UI framework dependency)
