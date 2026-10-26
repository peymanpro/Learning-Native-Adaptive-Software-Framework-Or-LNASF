# Next.js dnd-kit Playground — LNASF Adaptive Workflow Demo

An interactive playground for drag-and-drop patterns using Next.js, React, TypeScript, and dnd-kit. It combines a sortable list, a cross-column Kanban board, image previews, browser-local persistence, and an inspectable LNASF workflow-learning layer. This is an exploratory example of selected principles from the [Learning-Native Adaptive Software Framework (LNASF)](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF), not a complete implementation of the framework.

## Features

- Reorder a list with pointer and keyboard sensors.
- Move Kanban tasks between columns and reorder them within a column.
- Preview selected images locally with file-type and size validation.
- Persist the list and board in browser local storage.
- Observe successful user operations and learn event transitions during the current page session.
- Show optional, advisory next-step suggestions only when a transition has at least three samples and at least 65% empirical confidence.
- Clear learning observations or reset task data at any time.

## LNASF integration

The demonstration follows: **Observe → Learn → Predict → Decide → Adapt → Measure**.

- **Observe:** record successful list reorders, task reorders, and cross-column moves.
- **Learn:** count adjacent event transitions over a bounded window of at most 100 observations.
- **Predict:** estimate the next event from empirical transition frequencies.
- **Decide:** apply explicit support and confidence thresholds; hide weak predictions.
- **Adapt:** present a suggestion for the user to consider. The model never moves or reorders items itself.
- **Measure:** expose observation counts, transition counts, support, and confidence in the UI.

### Boundaries and limitations

- Learning observations exist only in memory for the current page session; they are not uploaded or persisted.
- Task content is not used as a learning feature. Only event categories are recorded.
- Suggestions are descriptive heuristics, not evidence of improved productivity or a validated predictive model.
- This is a client-side demonstration, not a production workflow engine.
- The image area creates local object URLs; it does not upload files to a server.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- Tailwind CSS 4

## Run locally

```bash
git clone https://github.com/peymanpro/LNASF-Adaptive-Next-dnd-kit-Playground.git
cd LNASF-Adaptive-Next-dnd-kit-Playground
npm ci
npm run dev
```

Open http://localhost:3000.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
npm audit --audit-level=high
```

GitHub Actions runs these checks on pushes and pull requests to `main`.

## Key files

- `lib/lnasf/workflow-model.ts` — bounded transition model and deterministic recommendation policy.
- `components/LnasfWorkflowPanel.tsx` — learning metrics and optional suggestions.
- `components/KanbanBoard.tsx` — deterministic drop handling and event observation.
- `components/SortableList.tsx` — accessible list sorting and event observation.
- `hooks/useLocalStorage.ts` — browser persistence with safe fallback behavior.

## License

No license is declared yet. Add a license file before presenting this repository as open source for reuse.
