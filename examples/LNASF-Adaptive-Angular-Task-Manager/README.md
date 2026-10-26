# Angular LNASF Adaptive Task Manager

A responsive task-management application built with Angular 19 standalone components. It demonstrates feature-oriented organization, a lightweight RxJS state service, a small NgRx counter, and a practical implementation of selected **Learning-Native Adaptive Software Framework (LNASF)** principles.

## Features

- Create, edit, complete, reopen, and delete tasks.
- Filter the list by all, active, or completed tasks.
- Persist task data in browser localStorage.
- Responsive UI with reusable standalone components.
- Use RxJS BehaviorSubject for the task collection and NgRx for the navbar's active-task count.
- Learn local task-workflow patterns and, when configured, offer next-step recommendations using a transparent TypeScript transition model.
- Inspect transition counts, observed frequency, and recommendation matches/misses.
- Switch between Passive, Advisory, and Adaptive modes, or reset the session model.

## LNASF workflow adaptation

The application observes task-action categories, learns transitions between consecutive actions, predicts the most frequently observed next action, and runs an explicit decision policy before showing a recommendation.

```text
Task/filter event
      |
      v
Observe action category
      |
      v
Learn transition frequencies
      |
      v
Predict likely next action
      |
      v
Decision policy
(minimum evidence + probability threshold + mode)
      |
      +---- Passive / weak evidence ----> normal task workflow
      |
      +---- Advisory -------------------> explain recommendation only
      |
      v
Adaptive: offer an optional, user-triggered UI action
      |
      v
Measure recommendation match or miss
```

The default mode is **Passive**, matching the approach used by the related LNASF examples. Passive mode continues learning and updating diagnostics without surfacing recommendations or changing task actions. Advisory mode displays a recommendation without an action button. Adaptive mode may offer an explicit button for low-risk UI actions, such as opening the add-task form or changing the filter.

The default decision policy requires at least **3 transitions** from the current action and a leading observed frequency of **65% or higher**. These are initial engineering thresholds, not statistically optimized values. The model stays in memory for the current page session and does not send telemetry. It records action categories only—not task titles, descriptions, IDs, dates, or account data.

No mode automatically completes, edits, or deletes a task. Normal task controls remain the authoritative fallback. This is a limited reference implementation, not a complete realization of LNASF and not a claim of measured productivity improvement.

See [docs/LNASF-WORKFLOW-REFERENCE.md](./docs/LNASF-WORKFLOW-REFERENCE.md) for the model, operating modes, policy, boundaries, and evaluation guidance. The broader framework is described in [Learning-Native Adaptive Software Framework](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF).

## Architecture

```text
src/app/
├── features/
│   ├── task/
│   │   ├── task.model.ts
│   │   ├── task.service.ts
│   │   └── store/                 # NgRx active-task counter
│   └── lnasf/
│       ├── workflow-transition-model.ts
│       ├── workflow-decision-policy.ts
│       ├── adaptive-workflow.service.ts
│       └── adaptive-workflow-panel.component.*
├── pages/
│   ├── home/
│   ├── about/
│   └── task-manager/
└── shared/
    ├── atoms/
    ├── molecules/
    └── organisms/
```

The LNASF model and decision policy are framework-independent TypeScript classes. An Angular service owns session state, while the panel presents the current mode and runtime measurements.

## Tech stack

- Angular 19 standalone components
- TypeScript
- RxJS BehaviorSubject
- NgRx Store
- HTML and CSS
- UUID
- Jasmine/Karma test setup

## Run locally

Prerequisites: a Node.js version compatible with Angular 19 and npm.

```bash
git clone https://github.com/peymanpro/angular-standalone-task-manager.git
cd angular-standalone-task-manager
npm install
npm start
```

Open http://localhost:4200.

## Quality checks

```bash
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

GitHub Actions runs the production build and unit tests on pushes and pull requests to master. The LNASF unit tests cover transition prediction, service feedback metrics, mode separation, evidence thresholds, and reset behavior. Performance gains have not been benchmarked.

## License

MIT
