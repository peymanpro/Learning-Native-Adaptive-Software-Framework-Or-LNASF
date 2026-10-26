# LNASF Adaptive Customizable Dashboard

A customizable Next.js dashboard that demonstrates a small, inspectable reference implementation of selected principles from the [Learning-Native Adaptive Software Framework (LNASF)](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF).

The dashboard includes sample business metrics, a revenue chart, recent orders, theme customization, data exports, and an **evidence-gated layout advisor**. The adaptive behavior is intentionally simple and transparent: it learns from explicit section-use signals and suggests a layout change only when the evidence gate passes and the user approves it.

## What it demonstrates

- **Observe:** the user explicitly records use of Metrics, Revenue Overview, Quick Actions, or Recent Orders.
- **Learn:** a bounded in-memory model counts adjacent section transitions.
- **Predict:** for the latest section, it estimates the most frequent next section from observed transitions.
- **Decide:** the candidate is eligible only with at least 3 outgoing transitions and at least 65% empirical confidence.
- **Adapt:** after the gate passes, the user can approve moving the candidate section to the top of the dashboard.
- **Measure:** the interface exposes the recent signal sequence, support count, empirical confidence, and gate state.

This is a small reference demo—not a complete implementation of LNASF, a neural network, or an LLM. It makes no claim that the suggestions improve productivity or performance.

## Features

- Responsive dashboard with sample metrics, revenue chart, quick actions, and recent orders.
- Theme customization for primary color, font family, border radius, and light/dark mode.
- Browser-local persistence for theme settings and the user's accepted layout.
- Downloadable JSON report snapshot and CSV export.
- Toggle between the five most recent orders and all ten sample orders.
- Explicit, bounded, session-only transition learning with an inspectable decision gate.
- Deterministic mock fixtures shared by the development Mirage server and Next.js API routes, so the sample dashboard also works in a production build.
- Unit tests for transition counting, evidence gates, and layout adaptation.

## LNASF safety and data boundaries

The learning model observes only the selected section identifier. It does not read customer names, order values, text inputs, user identity, or theme values as learning features.

- Section-use history stays in memory and resets on a full page reload.
- The history is bounded to the latest 100 distinct consecutive section changes.
- The current/default layout is the deterministic fallback.
- Prediction and adaptation are separate: a recommendation is not applied automatically.
- Theme settings and an accepted layout are saved in browser `localStorage`; learning history is not.
- The API data is generated sample data, not a production business data source.

A high-confidence transition is a heuristic based on the observed session sequence—not a validated user preference or proof of a benefit. The confidence/support thresholds are demonstration choices.

## Architecture

| Path | Responsibility |
| --- | --- |
| `src/lib/lnasf/dashboard-learning.ts` | Pure transition model, confidence calculation, gate, and layout utilities |
| `src/hooks/useDashboardLearning.ts` | Session-only state for learning observations |
| `src/components/lnasf/DashboardLearningPanel.tsx` | Evidence display, gate status, and user-approved adaptation |
| `src/pages/index.tsx` | Dashboard composition, layout persistence, report and CSV exports |
| `src/lib/mockApi/fixtures.ts` | Shared, deterministic sample data |
| `src/lib/mockApi/server.ts` | Development Mirage handlers |
| `src/pages/api/` | API fallback routes for sample metrics, chart data, and orders |
| `docs/LNASF-DASHBOARD-REFERENCE-IMPLEMENTATION.md` | LNASF mapping, decision boundary, evaluation protocol, and limitations |
| `tests/dashboard-learning.test.ts` | Deterministic unit tests for the learning model |

## Run locally

Requirements: Node.js 22 or another version supported by the installed Next.js release, and npm.

```bash
git clone https://github.com/peymanpro/LNASF-Adaptive-Customizable-Dashboard.git
cd LNASF-Adaptive-Customizable-Dashboard
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To see a layout recommendation, use **Record use** in different sections and repeat a sequence. The model needs at least three observed transitions from the latest section and 65% confidence before it enables **Apply suggestion: move to top**. Try patterns such as Metrics → Revenue Overview → Quick Actions, repeating the sequence and then selecting Metrics again to evaluate the Metrics transition history. The layout is only changed when you press the apply button.

## Quality checks

```bash
npm run typecheck
npm run test:lnasf
npm run lint
npm run build
```

GitHub Actions runs these checks on pushes and pull requests to `main`.

## Related work

- [LNASF research framework and candidate component contract](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF)
- [LNASF research-positioning record on Zenodo](https://doi.org/10.5281/zenodo.23310367)
- [LNASF Adaptive Next.js dnd-kit Playground](https://github.com/peymanpro/LNASF-Adaptive-Next-dnd-kit-Playground) — a separate example focused on drag-and-drop workflows and advisory next-action suggestions.

## Scope

This is an engineering reference example for selected LNASF ideas. The model is first-order and frequency-based, the user signals are explicit, the dataset is synthetic, and the adaptation is limited to layout ordering. Controlled evaluation would be needed before making claims about usability, productivity, or performance.

No license is declared yet; add an explicit license before inviting reuse of the code as open-source software.
