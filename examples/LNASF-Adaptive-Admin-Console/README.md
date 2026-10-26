# LNASF Adaptive Admin Console

An Angular 19 standalone admin application and a practical reference implementation of the [Learning-Native Adaptive Software Framework (LNASF)](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF).

The first implementation focuses on one small, measurable runtime adaptation: **learning navigation transitions and speculatively preloading a likely next page when the evidence and decision policy justify the cost**.

This is not an LLM-powered product. It uses a transparent, native TypeScript transition-frequency model to demonstrate the LNASF observe–learn–predict–decide–adapt–measure loop.

## Implemented

- **Learning:** an in-memory first-order transition model estimates the empirical probability of the next route from observed route-to-route navigation.
- **Explicit decision policy:** preloading requires at least 3 observations from the current route, a transition probability of at least 65%, a target on the allowlist, and an available speculative-work budget.
- **Constrained adaptation:** only known lazy-loaded app routes may be preloaded; at most one speculative code-chunk load can be in flight.
- **Deterministic fallback:** when evidence is weak, adaptation is disabled, a target is unavailable, or preloading fails, normal Angular navigation remains the fallback.
- **Measurement:** the UI reports observations, distinct transitions, attempted/completed/failed preloads, and whether the next navigation matched the previous completed preload.
- **Local-first behavior:** only route names are observed, in memory. No user identity, form values, product records, remote model, or external telemetry is sent by the learning service.
- **Adaptive Runtime screen:** inspect the current prediction, observed alternatives, decision reason, runtime counters, and adaptation toggle at `/adaptive`.

## How the LNASF loop maps to this app

```text
Angular Router navigation
        |
        v
Observe route transition
        |
        v
TypeScript transition-frequency model
        |
        v
Predict the next route + empirical probability
        |
        v
Decision policy (evidence, allowlist, budget, enabled state)
        |
        +---- Reject / uncertain ----> normal on-demand navigation
        |
        v
Speculatively import the permitted lazy-route chunk
        |
        v
Measure later route match / miss and preload result
```

The corresponding implementation lives in:

- `src/app/core/lnasf/transition-model.ts` — transparent transition learning and prediction.
- `src/app/core/lnasf/decision-policy.ts` — explicit separation between prediction and action.
- `src/app/core/lnasf/adaptive-navigation.service.ts` — routing observations, allowlisted preloading, and runtime metrics.
- `src/app/features/adaptive-runtime/` — live inspection and controls.
- `docs/LNASF-REFERENCE-IMPLEMENTATION.md` — design mapping, evaluation protocol, and current limitations.

## Run locally

Requires a Node.js version compatible with Angular 19 and pnpm.

```bash
pnpm install --frozen-lockfile
pnpm start
```

Sign in through the existing demo authentication flow, then open **Adaptive Runtime** from the sidebar. Visit Dashboard, Products, Users, and Settings in repeated patterns. The model learns only transitions that occur during the current page session; refreshing the browser resets the learned history.

Quality commands:

```bash
pnpm build
pnpm lint
pnpm test -- --watch=false
pnpm format:check
```

## Evaluation protocol

The dashboard exposes the model's observations and runtime outcomes, but this repository does **not** yet claim a measured performance improvement. To evaluate the hypothesis responsibly:

1. Exercise repeatable route sequences with adaptive preloading enabled and disabled.
2. Record route-navigation timings and chunk/network activity in browser developer tools.
3. Compare prediction hit rate, preload misses, extra bytes loaded, and navigation latency.
4. Repeat with cold and warm caches; report both results.
5. Keep the deterministic baseline and include adaptation overhead in any performance claim.

A prediction hit is not, by itself, proof of a latency improvement. Preloading can cost bandwidth and CPU when a prediction is wrong or a route is never visited.

## Scope and limitations

- This is an initial reference implementation of selected LNASF principles, not a complete realization of every framework mode or algorithm.
- The model is deliberately simple and interpretable; it is not a neural network or language model.
- Route history and runtime counters live in memory and reset on full page reload.
- The allowlist and thresholds are fixed in code for this first experiment.
- Predictive preloading warms the JavaScript module cache; the exact benefit depends on the browser, bundler, network, and route sequence.
- Existing product and user data still comes from the repository's demo API configuration.

## Related work

- [Learning-Native Adaptive Software Framework (LNASF)](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF)
- [LNASF Adaptive Admin Console history](https://github.com/peymanpro/LNASF-Adaptive-Admin-Console/commits/master)
