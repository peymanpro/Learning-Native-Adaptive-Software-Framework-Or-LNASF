# LNASF Dashboard Reference Implementation

This document explains the limited LNASF principles demonstrated by this dashboard. It is an engineering reference example, not a claim that the entire framework is implemented or that personalization improves productivity.

## Demonstrated loop

`Observe → Learn → Predict → Decide → Adapt → Measure`

| Stage | Implementation |
| --- | --- |
| Observe | The user explicitly records use of Metrics, Revenue, Quick Actions, or Recent Orders. |
| Learn | `src/lib/lnasf/dashboard-learning.ts` counts adjacent section transitions in a bounded, in-memory sequence. |
| Predict | For the most recently used section, the model selects the historically most frequent next section. |
| Decide | The prediction is eligible only after at least three outgoing transitions and at least 65% empirical confidence. |
| Adapt | A ready suggestion can move the predicted section to the top of the layout after the user approves it. |
| Measure | The panel shows the recent signal sequence, transition support, empirical confidence, and gate state. |

## Component boundary and safety

The learning model contains no UI, network access, identity, business records, or framework-specific state. It receives only a small enum identifying which dashboard area was explicitly selected.

The sequence is held in memory for the current page session, bounded to 100 distinct consecutive section changes, and cleared on reload. The model does not observe text inputs or customer/order content. The dashboard layout itself is stored locally so an accepted layout choice survives reloads.

Prediction and adaptation are separate. A candidate can be displayed while the evidence gate is closed, but the UI does not offer an apply action until support and confidence thresholds are met. Even a gate-passing prediction never changes the layout without user approval. The fallback is the current/default dashboard order.

## Evaluation protocol

This repository includes deterministic unit tests for transition counting, both gate conditions, layout normalization, and applying a proposed order. These tests establish behavior of the implementation; they do not establish a user benefit.

A future usability/performance evaluation should compare the default layout with user-approved suggested layouts, record task completion and time, include a no-learning baseline, and report both accepted and rejected recommendations. Do not claim improved productivity without controlled evidence.

## Current limitations

- The model learns only from explicit section-use signals, not passively inferred attention.
- It uses empirical first-order transition frequencies, not a neural network or LLM.
- The fixed confidence/support thresholds are demonstration choices, not validated optimal values.
- The dashboard uses generated mock data from Mirage JS in development.
- Predictions may reflect the order in which a user explores the page; this is not evidence of a stable personal preference.
