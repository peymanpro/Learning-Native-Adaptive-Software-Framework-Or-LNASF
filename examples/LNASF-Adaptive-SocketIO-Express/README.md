# Express + Socket.IO Chat Backend

A small real-time public-chat backend built with Express and Socket.IO. It demonstrates event-driven messaging, connection-scoped presence, typing indicators, input validation, configurable browser origins, and a health endpoint.

## Features

- Public chat events: join, welcome, messages, presence, join/leave notices, and typing indicators.
- Server-side validation for display names and message content.
- Each message receives a unique ID; IDs are not reused across all messages sent by one connection.
- Clients must join before publishing chat messages.
- Browser origins are configurable through `CHAT_ALLOWED_ORIGINS`.
- `GET /health` provides a lightweight health check.
- Importing the server module does not start a listener, so tests can create isolated instances.

## Requirements

- Node.js 22.12 or later (matches the `engines` requirement in `package.json`)
- npm

## Run locally

```bash
npm ci
npm run dev
# Uses Node.js native watch mode; nodemon is not required.
```

The server listens on `http://localhost:5000` by default. Set `PORT` to change the listener port.

```bash
curl http://localhost:5000/health
```

Expected response:

```json
{"status":"ok"}
```

This repository contains the backend only. Use a separate Socket.IO client application and point it at this server.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | HTTP and Socket.IO listener port |
| `CHAT_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated permitted browser origins |

For example: `CHAT_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`. Configure only trusted frontend origins in deployed environments. CORS is not authentication; this sample does not implement user identity or authorization.

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

Display names are trimmed and limited to 32 characters. Messages are trimmed and limited to 2,000 characters. Empty values, control characters, invalid payload types, and messages sent before joining are rejected through `chat-error`.

### Browser example

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");
socket.emit("user-join", "Ada");
socket.on("welcome", (data) => console.log(data.message));
socket.emit("send-message", { message: "Hello everyone!" });
socket.on("new-message", (message) => console.log(message.id, message.username, message.message));
socket.on("chat-error", (error) => console.error(error.code, error.message));
```

## Quality checks

```bash
npm run check
npm test
```

Tests use Node's built-in test runner for validation, model/policy behavior, and HTTP health/metrics. A live two-client integration test starts the actual server on an ephemeral local port and uses Engine.IO polling to verify that Adaptive mode suppresses duplicate typing-start events while typing-stop and primary chat messages still reach the other client. This is a protocol-level integration check, not a load or user-perceived latency benchmark. GitHub Actions runs syntax checks and all tests on pushes and pull requests.

## LNASF: learning-limited typing burst adaptation

The backend includes a native JavaScript learning component at `lnasf/typing-adaptation.js`. It observes inter-arrival gaps between typing-start events, updates an online frequency model, predicts the likelihood of a fast typing burst, and keeps prediction separate from the action policy. Only duplicate `typing-start` notifications may be suppressed; `typing-stop`, chat messages, validation, and authorization boundaries are never adaptive.

Set `LNASF_MODE=passive` (default), `advisory`, or `adaptive` before starting the server. Passive mode learns while retaining the original broadcast behavior. Advisory mode reports recommendations without applying them. Adaptive mode requires at least five learned gaps and confidence of at least 0.60 before it can suppress a repeated start inside its learned 150–500 ms window; otherwise the deterministic baseline broadcasts the event. `GET /lnasf/metrics` returns model evidence, the latest prediction/decision, and counters, including the observed suppression rate. The model and metrics are process-local and reset on restart.

Run LNASF-specific tests with `npm test`; they use deterministic timestamps and compare passive, advisory, adaptive, and cold-start behavior. No latency improvement is claimed without a separate end-to-end benchmark.



Framework context: [LNASF concept and architecture](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF) · [Technical specification](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF/blob/main/SPECIFICATION.md). This repository implements only the specific LNASF subset documented above; it is not a complete framework implementation.

## Dependency audit status

The development server uses Node.js native watch mode instead of the legacy `nodemon` dependency tree. The dependency lockfile pins `qs` to a patched compatible release and was regenerated through CI; no `--force` upgrade was used. The post-update GitHub Actions audit snapshot reported 0 npm advisories. Re-run the audit before deployment because findings change over time; a clean dependency audit alone is not a blanket production-readiness guarantee.

## Limitations

This is an in-memory demonstration, not a production chat service. Presence is lost on restart, multiple server instances do not share state, and the application has no authentication, persistence, distributed adapter, or rate limiter. Add these before exposing the service to untrusted users.
