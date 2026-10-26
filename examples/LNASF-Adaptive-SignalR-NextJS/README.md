# SignalR Chat Client — Next.js

A real-time chat client built with Next.js App Router, React, and Microsoft's SignalR JavaScript client. The project focuses on connection lifecycle behavior, defensive event handling, and an accessible UI that reflects the actual connection state.

## Demonstrated behavior

- A bounded reconnect policy with explicit connecting, connected, reconnecting, disconnected, and failed states.
- Rejoining the room after SignalR reconnects.
- A single client workspace boundary; SignalR lifecycle logic is separated from presentation and reducer logic.
- Runtime validation for display names, messages, presence lists, timestamps, and message identifiers.
- Message de-duplication and bounded client history (the latest 1,000 messages are retained).
- Typing notifications with timer cleanup and disabled sending while disconnected.
- Responsive participant list, visible focus, live status announcements, and reduced-motion support.

## Architecture

```text
app/page.js
  └── components/chat/ChatWorkspace.jsx
        └── lib/chat/use-chat-connection.mjs
              ├── lib/chat/signalr-client.mjs
              ├── lib/chat/protocol.mjs
              ├── lib/chat/reducer.mjs
              └── lib/chat/config.mjs
```

The hook owns a single `HubConnection`, registers event handlers, stops the connection during teardown, clears typing timers, and re-invokes `UserJoin` after reconnecting so the new server connection is associated with the display name again.

## Technology

- Next.js App Router and React
- `@microsoft/signalr`
- JavaScript modules and CSS modules
- Node's built-in test runner

## Requirements and setup

- Node.js 20.9 or newer
- npm
- A running SignalR backend that implements the contract below and allows the frontend origin through CORS

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The default hub URL is `http://localhost:5000/chat`.

### Configuration

`NEXT_PUBLIC_SIGNALR_HUB_URL` is read in the browser and is intentionally public. Do not put secrets in this variable. For a deployed environment, configure the correct HTTPS hub URL at build time and configure the server's CORS allow-list to match the frontend origin.

## Backend contract

The hub must provide these methods:

- `UserJoin(username)`
- `SendMessage(message)`
- `TypingStart()`
- `TypingStop()`

The client listens for `welcome`, `user-joined`, `user-left`, `new-message`, `online-users`, and `user-typing`. Message payloads include `username`, `message`, and a unique `id`; `time` is expected to be a parseable timestamp when supplied. Welcome payloads may include `message` and `users`.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The typecheck script performs syntax checks because the project intentionally remains JavaScript. The domain tests cover validation boundaries, message de-duplication, presence normalization, state transitions, and the retained-history limit. GitHub Actions also checks out and builds the companion `signalr-aspnetcore` project, starts its actual .NET 8 Hub, and runs a live transport integration test with two `@microsoft/signalr` connections. That test verifies room join, chat message delivery, and `TypingStart`/`TypingStop` events.

To run the live transport test locally, start the companion ASP.NET Core Hub on port 5000 and run:

```bash
LNASF_LIVE_HUB_URL=http://127.0.0.1:5000/chat npm run test:integration
```

Without `LNASF_LIVE_HUB_URL`, the dedicated integration test is skipped; the normal `npm test` suite remains deterministic and service-independent.

## Why JavaScript instead of TypeScript?

The client has a small runtime-defined protocol and no generated server contract. A partial TypeScript migration would not provide end-to-end safety at the SignalR boundary. Runtime normalization and a narrow state model provide explicit protections without introducing a second source of truth. A shared/generated contract would be a good reason to migrate.

## LNASF: outcome-aware reconnect policy

`lib/chat/lnasf-retry-policy.ts` is a native TypeScript learning component used by the SignalR reconnect policy. It records success/failure outcomes for each bounded delay, predicts success probability and confidence using Laplace-smoothed online counts, and calculates a simple utility that penalizes longer delays. The decision policy is separate from the prediction and selects a learned delay only when there is enough evidence and a material utility gain over the deterministic schedule.

Configure `NEXT_PUBLIC_LNASF_MODE=passive` (default), `advisory`, or `adaptive`. Passive learns without changing the retry schedule. Advisory exposes the recommended delay but uses the baseline schedule. Adaptive may select only from the fixed delay candidates `[0, 2000, 5000, 10000]`, with at most four retries and a 30-second elapsed-time cap. A zero-millisecond delay is eligible only for the first retry slot; later retry decisions keep a minimum 1-second delay floor. HTTP failures classified as non-retryable (including 400, 401, 403, 404, 405 and 426) stop the automatic loop without being taught as a failed delay outcome. Unknown network failures remain retryable by default. Insufficient evidence or a weak utility comparison falls back to the baseline; leaving the page is not counted as a failed attempt. The UI exposes mode, observed outcome count, and the latest policy decision. Model state is in memory and resets on page reload.

The LNASF unit tests use a deterministic clock and synthetic success/failure observations to cover online updates, confidence, prediction/decision separation, mode behavior, feedback, and retry bounds. The live transport test is run separately with `LNASF_LIVE_HUB_URL=http://127.0.0.1:5000/chat npm run test:integration` while the companion ASP.NET Core Hub is running on port 5000. It verifies the client/Hub event contract, not reconnect-performance improvement.



Framework context: [LNASF concept and architecture](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF) · [Technical specification](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF/blob/main/SPECIFICATION.md). This repository implements only the specific LNASF subset documented above; it is not a complete framework implementation.

## Dependency audit status

The original 2026-10-09 audit snapshot reported 16 findings. Next.js and React were upgraded to compatible patched direct versions, and the vulnerable development-time `eslint-config-next` chain was replaced with ESLint 9 plus React, Hooks, and JSX accessibility rules. The latest verified pre-gate audit snapshot reported 0 findings ([workflow](https://github.com/peymanpro/signalr-nextjs/actions/runs/37996041822)). CI now fails when high or critical npm audit findings are present; lower-severity findings remain visible in the report. See the [CI workflow](https://github.com/peymanpro/signalr-nextjs/actions/workflows/ci.yml) for the enforced check. The trade-off is that Next-specific `@next/eslint-plugin-next` rules are no longer enabled; React, Hooks, accessibility, and core ESLint checks remain. Audit results are snapshots, not proof of runtime exploitability.

## Limitations

This repository is a frontend client, not a complete chat service. CI now exercises two client connections against the live ASP.NET Core Hub at the transport/event-contract level. It still does not have a browser-driven UI test, does not provide authentication, authorization, persistence, historical message retrieval, or optimistic delivery acknowledgements, and has no real-network performance benchmark. The server remains responsible for authorization, rate limiting, and authoritative validation.
