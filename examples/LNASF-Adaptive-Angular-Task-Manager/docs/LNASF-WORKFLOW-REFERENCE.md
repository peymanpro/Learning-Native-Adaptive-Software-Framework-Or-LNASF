# LNASF Workflow Adaptation — Reference Implementation

## Purpose and scope

This project implements a small, local-first subset of the Learning-Native Adaptive Software Framework (LNASF). Rather than adding speculative route loading to a small task app, the feature learns relationships between task-workflow event categories and can surface a next-step recommendation when the evidence passes an explicit decision policy.

This is an engineering reference example, not a complete implementation of every LNASF concept and not a claim of measured productivity improvement.

## Observe → Learn → Predict → Decide → Adapt → Measure

| LNASF stage | Implementation |
| --- | --- |
| Observe | Record task additions, completions, reopenings, edits, deletions, and filter changes. |
| Learn | Count transitions between consecutive event categories using a plain TypeScript model. |
| Predict | Estimate the most frequently observed next category and its empirical frequency. |
| Decide | Require at least 3 outgoing observations and a leading probability of at least 0.65. |
| Adapt | Passive does not surface recommendations; Advisory displays recommendations without action controls; Adaptive exposes optional, user-triggered, non-destructive UI actions. |
| Measure | Count observed transitions, distinct patterns, and whether subsequent recorded actions matched/missed recommendations. |

## Operating modes

- **Passive (default):** observe and learn in the background while leaving the task UI unchanged.
- **Advisory:** display a recommendation only when the evidence gates pass. It does not expose an action button or change the workflow.
- **Adaptive:** display the eligible recommendation and offer a button only for low-risk UI operations, such as opening the add-task form or changing the visible filter.

No mode automatically completes, edits, or deletes a task. The same explicit task controls remain authoritative. Weak evidence and disabled/no-action conditions fall back to the normal task workflow.

## Model

The model estimates the conditional transition frequency:

P(next = j | current = i) = count(i → j) / sum_k count(i → k)

This is a first-order empirical transition-frequency model, not a calibrated uncertainty estimate or neural network. Ties are broken deterministically by action name. The model observes action categories only, never task titles, descriptions, IDs, dates, account identifiers, or task contents.

## Decision policy

The default thresholds are 3 outgoing observations and a leading observed frequency of 0.65. These are explicit starting values, not statistically optimized thresholds. A valid prediction is not automatically an action: mode, evidence, and the supported action set are evaluated separately. The Adaptive mode is deliberately limited to user-confirmed, non-destructive UI actions. Destructive or item-specific actions are never automated.

The current implementation does not assign invented numeric utility scores to UI suggestions. Before optimizing a utility-aware policy, a follow-up evaluation should define a measurable cost/benefit objective and collect evidence for it.

## Local behavior and evaluation

Learning and counters are held in memory for the current page session and reset on refresh. There is no network call or telemetry. The task list's existing data persistence remains unchanged; the LNASF model itself is not written to localStorage.

The panel reports observations, distinct transition patterns, recommendation matches, and misses. These are behavioral diagnostics, not evidence of better task completion time or productivity. A meaningful follow-up evaluation should compare modes over repeatable task sequences, report recommendation match rate and user acceptance separately, and avoid treating correlation as proof of efficiency improvement.

## Tests

The unit tests cover transition counts, top-action prediction, reset behavior, mode separation, minimum evidence, and the probability threshold. Run the project test command to execute them.

## Related references

- [LNASF technical concept and architecture specification](https://github.com/peymanpro/learning-native-adaptive-software-framework)
- [Angular LNASF Adaptive Admin Console reference implementation](https://github.com/peymanpro/LNASF-Adaptive-Admin-Console)
- [LNASF real-time communication examples](https://github.com/peymanpro/learning-native-adaptive-software-framework/blob/main/REALTIME-COMMUNICATION-EXAMPLES.md)
