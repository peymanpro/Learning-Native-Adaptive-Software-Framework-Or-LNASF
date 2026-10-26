# Learning-Native Adaptive Software Framework (LNASF)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23310367.svg)](https://doi.org/10.5281/zenodo.23310367)

**Current release:** `v0.2.0` — Research Positioning and Candidate Component Contract  
**Research status:** Working research proposal. The candidate contribution and its novelty remain under validation; this is not a peer-reviewed paper or evidence of demonstrated performance gains.

**Author:** Peyman Salimi  
**Current release date:** 2026-10-12  
**Historical artifact:** The Version 0.1 technical specification is preserved as a separate snapshot.

## About

LNASF is a proposed architectural framework for building reusable software components that can observe runtime behavior, learn from experience, make constrained predictions and decisions, and adapt selected aspects of their behavior while retaining a deterministic fallback.

The central loop is:

`Observe -> Learn -> Predict -> Decide -> Adapt -> Measure -> Learn`

The framework is intended to be applicable to libraries, frameworks, runtimes, developer tools, frontend systems, backend systems, and infrastructure.

## Important Positioning

LNASF does **not** claim to invent machine learning, self-adaptive software, online learning, runtime adaptation, MAPE-K, predictive prefetching, or learning-enabled components. Those areas have substantial prior art.

The work records a specific proposed architectural formulation centered on:

- learning as an explicit reusable software-component capability;
- native learning within the host ecosystem;
- scratch implementations of learning mechanisms for reference implementations;
- explicit separation of prediction and decision;
- confidence and utility-aware adaptation;
- deterministic fallbacks;
- constrained runtime adaptation;
- applicability across multiple software layers and programming languages.

## Candidate Research Contribution (Under Validation)

The candidate contribution is the **LNASF Component Contract**: a proposed, testable component-boundary specification that makes observation, model updates, prediction/evidence, adaptation admission, allowed actions, deterministic fallback, and outcome evaluation explicit.

For a component `C`, the proposed contract is:

$$
\mathrm{LCC}(C) = (B,O,M,P,G,A,F,E)
$$

Here `G` is an explicit adaptation-admission gate separated from prediction; the other terms specify the baseline, observations, update procedure, prediction evidence, permitted actions, fallback, and evaluation/feedback.

The intended distinction is not a claim to invent online learning or self-adaptive software. Closely related prior art includes REX, ML-DEECo, component-based ML abstractions, adaptive feedback-loop architectures, Rainbow's reusable adaptation infrastructure, and the FORMS reference model. LNASF cannot claim novelty merely for unifying or reusing adaptation principles. The phrase “learning-native software systems” has also appeared as a research direction in a REFSQ 2022 Industry Track talk; LNASF does not claim novelty for the term or the broad aspiration of software that observes, learns, and tunes itself. Whether the proposed contract adds a defensible distinction remains to be established by full-text comparison and controlled evaluation.

- [Research positioning and preliminary prior-art comparison](RESEARCH-POSITIONING.md)
- [Editable specification and proposed contract](SPECIFICATION.md#241-candidate-contribution-the-lnasf-component-contract)

## Reference Implementation

The [LNASF Adaptive Admin Console](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framework-Or-LNASF/tree/main/examples/LNASF-Adaptive-Admin-Console) is an application-level reference implementation of a **limited subset** of these principles. It uses a native TypeScript transition-frequency model, an explicit decision policy, constrained predictive route preloading, a deterministic fallback, and runtime counters.

This implementation is an engineering demonstration—not a claim that the full LNASF framework is complete or that adaptive preloading has already produced a measured performance gain. Its README documents the architecture, tests, evaluation protocol, and current limitations.

## Implementation map and scope

The projects below are **runnable examples of selected LNASF principles**, imported into this repository under `examples/` with Git subtree merges that preserve their source commit histories. Each link opens the corresponding project folder. They are not all complete implementations of the LNASF framework, and their demonstrations do not by themselves establish performance or productivity gains.

### Application-level examples

- **[LNASF Adaptive Admin Console](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framework-Or-LNASF/tree/main/examples/LNASF-Adaptive-Admin-Console)** — an Angular application that learns navigation-transition frequencies and conditionally preloads an allowed lazy-loaded route. It separates prediction from the decision to preload, keeps normal navigation as the fallback, and exposes runtime counters for evaluation.
- **[LNASF Adaptive Angular Task Manager](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framework-Or-LNASF/tree/main/examples/LNASF-Adaptive-Angular-Task-Manager)** — a task-management application that observes categories of task actions, learns common action transitions, and can offer bounded next-step recommendations in Passive, Advisory, or Adaptive mode. Recommendations do not automatically complete, edit, or delete tasks.
- **[LNASF Adaptive Customizable Dashboard](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framework-Or-LNASF/tree/main/examples/LNASF-Adaptive-Customizable-Dashboard)** — a Next.js dashboard that learns transitions between explicitly recorded section-use events and may suggest moving a section to the top only after evidence thresholds pass and the user approves the change.

### Real-time communication examples

These examples apply a narrow learning/adaptation policy to chat typing events or connection retry behavior. They are deliberately bounded demonstrations, not production-ready messaging infrastructure.

- **[LNASF Adaptive SignalR — ASP.NET Core](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framework-Or-LNASF/tree/main/examples/LNASF-Adaptive-SignalR-ASPNetCore)** — an ASP.NET Core 8 and SignalR chat backend with a native C# online model that learns typing-event intervals. In Adaptive mode, it may suppress duplicate `typing-start` notifications only when evidence and confidence thresholds pass; messages, `typing-stop`, and validation remain outside the adaptive policy.
- **[LNASF Adaptive SignalR — Next.js Client](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framework-Or-LNASF/tree/main/examples/LNASF-Adaptive-SignalR-NextJS)** — a Next.js SignalR chat client that learns from retry success/failure outcomes and can select a bounded reconnect delay when the evidence and utility policy justify it. It includes reconnect lifecycle handling, event validation, and bounded retry limits.
- **[LNASF Adaptive Socket.IO — Express](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framework-Or-LNASF/tree/main/examples/LNASF-Adaptive-SocketIO-Express)** — an Express and Socket.IO chat backend with a JavaScript typing-burst model. Its adaptive behavior is limited to duplicate typing-start notifications; the default Passive mode preserves ordinary message delivery.
- **[LNASF Adaptive Socket.IO — NestJS](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framework-Or-LNASF/tree/main/examples/LNASF-Adaptive-SocketIO-NestJS)** — a NestJS WebSocket gateway and Socket.IO chat backend that demonstrates the same bounded typing-burst adaptation through a native TypeScript model, with explicit operating modes, evidence thresholds, fallback, and runtime metrics.
- **[LNASF Adaptive Socket.IO — React Client](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framework-Or-LNASF/tree/main/examples/LNASF-Adaptive-SocketIO-React)** — a React and Socket.IO chat client that learns from connection retry outcomes and applies a bounded retry policy. It distinguishes retryable network failures from disconnects that require user action and exposes policy diagnostics in the UI.

### Focused frontend state and interaction examples

- **[LNASF Adaptive React useState Hook](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framework-Or-LNASF/tree/main/examples/LNASF-Adaptive-React-useState-Hook)** — an experimental TypeScript/React state-management library that learns observed state transitions, estimates statistical confidence, applies explicit safety and decision gates, and retains deterministic application-driven updates as the fallback. It is a research-oriented hook/library example, not a replacement that is universally superior to React's built-in `useState`.
- **[LNASF Adaptive Next.js dnd-kit Playground](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framework-Or-LNASF/tree/main/examples/LNASF-Adaptive-Next-dnd-kit-Playground)** — an interactive Next.js drag-and-drop and Kanban playground that learns transitions between successful UI event categories and presents optional next-step suggestions when minimum evidence thresholds are met. Suggestions are advisory; the model does not reorder items or move tasks automatically.

## Real-Time Communication Examples

The [LNASF real-time communication examples](REALTIME-COMMUNICATION-EXAMPLES.md) document five limited integrations across Express, NestJS, ASP.NET Core, Next.js and React. They make host-native learning, explicit prediction/decision separation, bounded adaptation, deterministic fallback, and runtime measurement executable. The document links the relevant code/test areas through each repository's README and records verified CI evidence. It distinguishes synthetic unit-level checks from real-world performance claims; these are selected reference examples, not complete LNASF implementations.

## Frontend State and Interaction Examples

The [LNASF frontend state and interaction examples](FRONTEND-STATE-AND-INTERACTION-EXAMPLES.md) document two limited research demonstrations: the [React useState hook](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framework-Or-LNASF/tree/main/examples/LNASF-Adaptive-React-useState-Hook) explores online state-transition learning with explicit adaptation and safety gates; the [Next.js dnd-kit playground](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framework-Or-LNASF/tree/main/examples/LNASF-Adaptive-Next-dnd-kit-Playground) learns from interaction-event sequences and presents user-controlled workflow suggestions. They demonstrate selected principles at different frontend boundaries, not the complete LNASF framework.

## Release and Archival Status

Version `v0.2.0` has been published on GitHub and archived on Zenodo.

- **GitHub release:** [LNASF v0.2.0 — Research Proposal Draft](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF/releases/tag/v0.2.0). The release includes the compiled 13-page research-positioning PDF.
- **Zenodo record:** [Version 0.2.0](https://zenodo.org/records/23310367), DOI [10.5281/zenodo.23310367](https://doi.org/10.5281/zenodo.23310367). The record archives the versioned repository source snapshot.

The v0.2.0 draft formalizes the candidate LNASF Component Contract and records preliminary related work, research questions, and a proposed evaluation plan. The contribution is still a research proposal: the related-work comparison is preliminary, full-text comparison is incomplete, and controlled empirical evaluation has not established novelty or performance benefits.

The existing `LNASF-v0.1.tex` and `LNASF-v0.1-Technical-Specification.pdf` remain the historical Version 0.1 snapshots. The v0.2.0 source was compiled into the research-positioning PDF attached to the GitHub release. The release workflow regenerates and verifies the SHA-256 manifest at publication time.

The manual GitHub Release workflow validates version metadata, regenerates and verifies the SHA-256 manifest, creates an annotated version tag, and publishes the GitHub Release with the compiled PDF attached. The Zenodo v0.2.0 record is also live; future versions should be checked separately after the repository integration processes them.

## Files

- `SPECIFICATION.md` - editable specification with LaTeX math.
- `LNASF-v0.1.tex` - historical LaTeX source for the Version 0.1 PDF.
- `LNASF-v0.2-draft.tex` - working source for the candidate component contract and research proposal.
- `LNASF-v0.1-Technical-Specification.pdf` - historical Version 0.1 publication snapshot.
- `LNASF-v0.2-Research-Positioning.pdf` - compiled 13-page research-proposal draft attached to the v0.2.0 GitHub release.
- `references/` - bibliography source.
- `CITATION.cff` - software citation metadata for the versioned repository release.
- `metadata/SHA256SUMS.txt` - release-time SHA-256 manifest; the release workflow regenerates and verifies it for the tagged version. On `main`, the pre-release warning may remain until that workflow runs.
- `FRONTEND-STATE-AND-INTERACTION-EXAMPLES.md` - limited frontend state and workflow research examples.
- `RESEARCH-POSITIONING.md` - preliminary prior-art comparison, candidate contribution, and evaluation plan.
- `RELEASE-PROCESS.md` - versioned GitHub release and Zenodo archival setup.
- `CHANGELOG.md` - version history.

## Citation

The current v0.2.0 research-positioning draft can be cited as:

Salimi, P. (2026). *Learning-Native Adaptive Software Framework (LNASF): Research Positioning and Candidate Component Contract* (Version 0.2.0) [Research proposal draft]. Zenodo. https://doi.org/10.5281/zenodo.23310367

The historical Version 0.1 specification remains a separate artifact:

Salimi, P. (2026). *Learning-Native Adaptive Software Framework (LNASF): Technical Concept and Architecture Specification* (Version 0.1).

Do not treat the Version 0.1 PDF as containing the candidate Component Contract introduced in the v0.2.0 research draft.
