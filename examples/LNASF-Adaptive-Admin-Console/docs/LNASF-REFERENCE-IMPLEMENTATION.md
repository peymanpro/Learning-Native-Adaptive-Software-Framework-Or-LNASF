# LNASF Reference Implementation: Adaptive Navigation

## Purpose

This application is a small, inspectable reference implementation of selected principles from the Learning-Native Adaptive Software Framework (LNASF). It is intentionally narrower than the framework specification: the first target is adaptive loading of Angular route chunks, not general-purpose autonomous software or LLM integration.

## Architecture mapping

| LNASF principle | Implementation |
| --- | --- |
| Learning is an explicit capability | `TransitionModel` owns route-transition counts and prediction. |
| Native learning | The core model is plain TypeScript and has no ML framework dependency. |
| Prediction is not action | `DecisionPolicy` evaluates the prediction before a preload is allowed. |
| Adaptation is constrained | Only an explicit set of route loaders is eligible; one speculative load may be in flight. |
| Deterministic fallback | Weak evidence, disabled adaptation, failures, and unavailable targets retain normal on-demand navigation. |
| Feedback matters | The service records whether the next route matches the last completed speculative preload. |
| Learning should be measurable | The Adaptive Runtime screen exposes observations, distinct transitions, preload outcomes, and prediction matches/misses. |
| Local-first observation | The model uses route names in memory and does not transmit telemetry. |

## Learning model

For a source route (i) and possible next route (j), the model estimates:

```text
P(next = j | current = i) = count(i -> j) / sum_k count(i -> k)
```

This is an empirical transition frequency (a first-order Markov-style model), not a calibrated uncertainty estimate. The route with the highest observed frequency is the candidate prediction. Ties are broken deterministically by route name so repeated test runs remain understandable.

## Decision policy

The initial policy requires all of the following:

- Adaptation is enabled.
- The target exists in the explicit route-loader allowlist.
- At least 3 outgoing transitions have been observed from the current route.
- The empirical probability of the leading route is at least 0.65.
- The target has not already been visited, preloaded, or queued.
- No other speculative preload is currently in flight.

These values are experimental defaults, not statistically optimal thresholds. They should be evaluated against actual browser navigation data before being tuned.

## Evaluation methodology

Use controlled, repeatable route sequences with adaptation enabled and disabled. Measure:

- time from navigation intent to route content readiness;
- bytes and requests introduced by speculative loading;
- prediction hit rate and miss rate;
- preload failure rate;
- model and adaptation overhead;
- outcomes under cold cache and warm cache conditions.

Report the deterministic baseline as well as the adaptive version. A higher prediction hit rate does not guarantee better perceived latency because speculative work has network, CPU, and memory costs.

## Safety and privacy boundaries

- Observe only normalized, allowlisted route names.
- Do not observe user IDs, form contents, product values, authentication tokens, or other business payloads.
- Keep model state in memory for the current application session.
- Never use a prediction to authorize a business action or bypass routing/authentication guards.
- On prediction rejection or preload failure, retain Angular's normal on-demand route loading.

## Known limitations

- The model is first-order and considers only the immediately previous route; it has no user context and does not adapt to temporal changes within a route sequence.
- It learns only from routes visited during one SPA session.
- Preloading a lazy component imports its JavaScript module, but does not guarantee that Angular's rendered component instance or API data will be warm.
- There is no performance benchmark yet; the screen reports runtime behavior, not proof of a performance gain.
- This implementation does not cover LNASF autonomous mode, shared learning, model-drift detection, or all framework concepts.

## Relevant specification

See the [LNASF technical specification](https://github.com/peymanpro/learning-native-adaptive-software-framework/blob/main/SPECIFICATION.md).
