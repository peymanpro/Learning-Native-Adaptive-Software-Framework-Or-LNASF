# React + Socket.IO Chat Client

A React 19 frontend for a public real-time chatroom, built with Socket.IO Client and Vite. It focuses on connection lifecycle, live presence and typing updates, defensive event handling, and bounded client-side state.

## Features

- Live messages, participant presence, join/leave notices, and typing indicators.
- Reconnection handling that re-announces the participant after Socket.IO assigns a new connection.
- Display-name and message validation at the UI boundary, complementing server-side validation.
- Unique message IDs separated from the sender's socket ID.
- Bounded in-memory message history: only the latest 1,000 chat and system messages are retained.
- Connection errors and server validation errors are shown to the user.
- Socket event listeners and typing timers are cleaned up.
- Persian-localized system-message time display; backend timestamps are preserved for chat messages.

## Requirements

- Node.js 22.12 or later (required by the current Vite toolchain)
- npm
- A Socket.IO backend implementing the event contract below (for example, the companion Express or NestJS backend)

## Run locally

```bash
npm ci
npm start
```

The Vite development server opens at `http://localhost:5173` and connects to `http://localhost:5000` by default.

### Configuration

Create `.env.local` or `.env` in the project root:

```bash
VITE_SOCKET_SERVER_URL=http://localhost:5000
VITE_LNASF_MODE=passive
```

Restart the development server after changing the variable. The client must use the same origin allowed by the backend CORS configuration.

## Socket.IO event contract

| Direction | Event | Payload |
| --- | --- | --- |
| Client → server | `user-join` | `string username` |
| Client → server | `send-message` | `{ message: string }` |
| Client → server | `typing-start` | no payload |
| Client → server | `typing-stop` | no payload |
| Server → client | `welcome` | `{ message, users: string[] }` |
| Server → client | `user-joined` | `{ username, message, time }` |
| Server → client | `user-left` | `{ username, message, time }` |
| Server → client | `new-message` | `{ username, message, time, id, senderId }` |
| Server → client | `online-users` | `string[]` |
| Server → client | `user-typing` | `{ username, isTyping }` |
| Server → client | `chat-error` | `{ code, message }` |

Names are trimmed and limited to 32 characters. Messages are trimmed and limited to 2,000 characters. Multiline message text is allowed; invalid control characters and blank messages are rejected. The server remains authoritative and must validate every event independently.

## Checks

```bash
npm test
npm run build
```

The unit suite covers protocol validation, retry-policy decisions, and message-history bounds. GitHub Actions also starts the actual `socketio-express` backend and runs `npm run test:integration` with two rendered React clients over a live Socket.IO transport. The integration verifies join, typing notifications, and primary chat-message delivery; it is a real transport/component test, not a browser automation or performance benchmark.

## LNASF: outcome-aware reconnect policy

The native JavaScript module `src/lnasf/retryPolicy.js` observes actual retry success/failure outcomes by selected delay, learns an online success rate, predicts success probability and confidence with Laplace-smoothed counts, and uses a utility penalty for longer waits. Its decision policy is separate from prediction. The Socket.IO Manager's automatic reconnection is disabled so the bounded policy can control scheduled attempts explicitly; the first connection attempt remains immediate. Network failures such as `ping timeout` and `transport close` are eligible for bounded retry. Socket.IO's `io server disconnect` and manual `io client disconnect` reasons are not automatically retried; a server-forced disconnect is surfaced as terminal and requires the user to choose **Retry connection** explicitly.

Configure `VITE_LNASF_MODE=passive` (default), `advisory`, or `adaptive`. Passive learns without changing the schedule; Advisory exposes a recommended delay but keeps the baseline; Adaptive selects only from `[0, 2000, 5000, 10000]` when enough outcomes and a meaningful utility improvement exist. The policy allows at most four retries or 30 seconds per episode. A Retry connection action begins a new bounded episode. `LNASF` diagnostics in the UI show the current mode, observed outcomes, and last decision. Model state remains in memory for the current page.

Vitest unit tests use synthetic outcomes and a deterministic clock to verify learning, mode separation, decision thresholds, feedback, and retry limits. For the live transport test, start the Express backend on port 5000 and run `LIVE_SOCKETIO_URL=http://127.0.0.1:5000 VITE_SOCKET_SERVER_URL=http://127.0.0.1:5000 npm run test:integration`. This test validates event compatibility and delivery, not reconnect-performance gain.



Framework context: [LNASF concept and architecture](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF) · [Technical specification](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF/blob/main/SPECIFICATION.md). This repository implements only the specific LNASF subset documented above; it is not a complete framework implementation.

## Dependency audit status

The project has migrated from the legacy Create React App `react-scripts` toolchain to Vite and Vitest. The latest verified pre-gate GitHub Actions audit snapshot reported zero npm findings ([CI](https://github.com/peymanpro/socketio-react/actions/runs/37995967533)). CI now fails when high or critical npm audit findings are present; lower-severity findings remain visible in the report. See the [CI workflow](https://github.com/peymanpro/socketio-react/actions/workflows/ci.yml) for the enforced check. Run `npm audit` locally for the latest advisory database; a clean snapshot is not a blanket production-readiness guarantee.

## Limitations

This repository is only the browser client. It does not provide a backend, authentication, authorization, message history, persistence, or rate limiting. Do not treat client-side validation as a security boundary.
