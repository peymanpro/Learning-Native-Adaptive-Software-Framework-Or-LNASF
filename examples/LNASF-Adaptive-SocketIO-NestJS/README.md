# NestJS + Socket.IO Chat Backend

A small real-time public-chat backend built with NestJS, its WebSocket gateway abstraction, and Socket.IO. The implementation keeps chat events in a gateway, validates untrusted payloads, and exposes origin configuration for local or deployed clients.

## Features

- Socket.IO events for joining, welcome messages, chat messages, presence, join/leave notices, and typing indicators.
- Server-side validation for display names and message text.
- Unique message IDs per published message.
- A client must join before it can publish messages or typing status.
- Duplicate join requests for the same socket and display name do not produce duplicate presence announcements.
- CORS allow-list and port can be configured with environment variables.

## Requirements

- Node.js 22.12 or later (matches the `engines` requirement in `package.json`)
- npm

## Run locally

```bash
npm ci
npm run start:dev
```

The service listens on port `5000` by default. Set `PORT` to use another port.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | HTTP and Socket.IO listener port |
| `CHAT_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list of browser origins |

Example:

```bash
CHAT_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 npm run start:dev
```

Only configure trusted origins in a deployed environment. CORS is not authentication; this sample does not implement identity, authorization, persistence, or rate limiting.

## Event contract

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

Display names are trimmed and limited to 32 characters; messages are trimmed and limited to 2,000 characters. Empty strings, control characters, non-string values, and messages sent before joining are rejected with `chat-error`.

## Example client

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");
socket.emit("user-join", "Ada");
socket.on("welcome", console.log);
socket.emit("send-message", { message: "Hello from Socket.IO" });
socket.on("new-message", console.log);
socket.on("chat-error", console.error);
```

## Validation

```bash
npm run build
npm test
```

The automated suite covers validation boundaries, the native model and policy, Passive/Advisory/Adaptive behavior, fallback, and a live two-client Socket.IO integration test. The integration test boots the actual NestJS application on an ephemeral local port and verifies that Adaptive mode suppresses duplicate typing-start events without suppressing typing-stop or a primary chat message. It checks event delivery, not throughput or user-perceived latency. GitHub Actions builds the application and runs the suite on pushes and pull requests.

## LNASF: native typing-burst adaptation

`src/lnasf/typing-adaptation.ts` implements the Observe–Learn–Predict–Decide–Adapt–Measure path using an in-process frequency model over inter-arrival gaps between typing-start events. The Gateway delegates the decision and only suppresses duplicate typing-start notifications; typing-stop, chat messages, and validation remain non-adaptive.

Set `LNASF_MODE=passive` (default), `advisory`, or `adaptive` before starting the backend. Passive learns without changing delivery. Advisory reports a recommendation without applying it. Adaptive requires at least five learned gaps and confidence of at least 0.60 before applying a bounded 150–500 ms duplicate cooldown; insufficient evidence falls back to broadcasting. `GET /lnasf/metrics` exposes evidence, the current prediction and decision, and measured suppression counters. State is process-local and resets on restart.

LNASF tests use deterministic timestamps and directly verify the model, policy separation, modes, and fallback. No performance gain is claimed without live multi-client benchmarking.



Framework context: [LNASF concept and architecture](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF) · [Technical specification](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF/blob/main/SPECIFICATION.md). This repository implements only the specific LNASF subset documented above; it is not a complete framework implementation.

## Dependency audit status

The project is aligned on NestJS 12 and TypeScript 6.0.3, with the lockfile regenerated and validated by CI. The latest verified audit snapshot reported zero npm findings ([workflow](https://github.com/peymanpro/socketio-nestjs/actions/runs/37994534363)). CI now fails when high or critical findings are present; lower-severity findings remain visible in the audit report. Re-run the audit before release because advisories change over time. No `--force` dependency upgrade is used, and a clean audit is not a blanket production-readiness guarantee.

## Limitations

Presence is held in process memory and is lost on restart. Multiple instances do not share presence; configure a compatible Socket.IO adapter before horizontal scaling. This project is a portfolio sample, not a secured production messaging service.
