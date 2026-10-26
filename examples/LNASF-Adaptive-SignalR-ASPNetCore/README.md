# ASP.NET Core + SignalR Chat Backend

A minimal real-time public-chat backend using ASP.NET Core 8 and SignalR. It demonstrates hub-based messaging, online presence, typing indicators, server-side input validation, and a configurable browser-origin allow-list.

## Features

- SignalR hub mapped at `/chat`.
- Join/welcome, message, presence, leave, and typing events.
- Thread-safe in-memory connection presence.
- Display names limited to 32 characters and messages limited to 2,000 characters.
- A unique identifier for every published message, so clients can deduplicate individual messages safely.
- Configurable listener URL through `ASPNETCORE_URLS` and trusted frontend origins through `CHAT_ALLOWED_ORIGINS`.
- `GET /health` for a basic health check.

## Requirements

- .NET 8 SDK

## Run locally

From the repository root:

```bash
dotnet restore signalr-aspnetcore-public-chatroom.sln
dotnet run --project src/src.csproj
```

The default ASP.NET Core URL is usually `http://localhost:5000` when configured as shown below. The hub endpoint is `http://localhost:5000/chat`.

### Configuration

`CHAT_ALLOWED_ORIGINS` is a semicolon-separated list. The default development allow-list is:

```text
http://localhost:3000
http://127.0.0.1:3000
http://127.0.0.1:5500
```

PowerShell example:

```powershell
$env:ASPNETCORE_URLS = "http://localhost:5000"
$env:CHAT_ALLOWED_ORIGINS = "http://localhost:3000;http://127.0.0.1:3000"
dotnet run --project src/src.csproj
```

Configure only trusted frontend origins in deployed environments. CORS is not authentication. This sample does not implement user identity, authorization, persistence, or rate limiting.

## SignalR hub contract

### Client invokes

| Method | Argument |
| --- | --- |
| `UserJoin` | `string username` |
| `SendMessage` | `string message` |
| `TypingStart` | no arguments |
| `TypingStop` | no arguments |

### Server sends

| Event | Payload |
| --- | --- |
| `welcome` | `{ message, users: string[] }` |
| `user-joined` | `{ username, message, time }` |
| `user-left` | `{ username, message, time }` |
| `new-message` | `{ username, message, time, id }` |
| `online-users` | `string[]` |
| `user-typing` | `{ username, isTyping }` |

Timestamps are emitted as UTC ISO-8601 strings. Invalid input and sending a message before joining result in a SignalR hub error.

## Run tests

```bash
dotnet test signalr-aspnetcore-public-chatroom.sln
dotnet build signalr-aspnetcore-public-chatroom.sln --configuration Release
```

The test project covers display-name and message validation boundaries, LNASF model/policy behavior, and a live Hub integration test. The integration test starts the built ASP.NET Core app as a child process, negotiates SignalR, connects two real WebSocket clients, and verifies adaptive typing-start suppression while typing-stop and primary chat messages are still delivered. This is a protocol correctness test, not a load test or performance benchmark. GitHub Actions builds the solution and runs the full suite on pushes and pull requests.

## LNASF: native typing-burst adaptation

`src/Lnasf/TypingAdaptationService.cs` adds a native C# frequency model over inter-arrival gaps between typing-start calls, an explicit decision policy, bounded duplicate suppression, and runtime measurements. The Hub delegates typing starts to this policy; typing-stop and chat messages always pass through. The adaptive rule cannot alter message validation, membership checks, or other security-sensitive behavior.

Set `LNASF_MODE=passive` (default), `advisory`, or `adaptive`. Passive learns without changing delivery; Advisory exposes the recommendation but broadcasts; Adaptive requires at least five gap samples and confidence of at least 0.60 before suppressing a duplicate within its learned 150–500 ms window. Insufficient evidence falls back to deterministic broadcast. `GET /lnasf/metrics` exposes model statistics and action counters. Learning state is local to the process and is not persisted.

`dotnet test` includes deterministic LNASF tests for model updates, prediction confidence, mode separation, fallback, and measured suppression. No performance gain is claimed without an end-to-end SignalR workload benchmark.



Framework context: [LNASF concept and architecture](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF) · [Technical specification](https://github.com/peymanpro/Learning-Native-Adaptive-Software-Framewor-Or-LNASF/blob/main/SPECIFICATION.md). This repository implements only the specific LNASF subset documented above; it is not a complete framework implementation.

## Limitations

Presence is process-local and disappears on restart. Multiple server instances need a shared presence store and a supported SignalR scale-out service. Authentication, authorization, persistence, backpressure, and rate limiting are intentionally out of scope.
