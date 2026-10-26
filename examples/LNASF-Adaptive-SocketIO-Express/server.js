const express = require("express");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { Server } = require("socket.io");
const { normalizeMessage, normalizeUsername } = require("./chat-validation");
const { TypingAdaptationService } = require("./lnasf/typing-adaptation");

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000"];

function getAllowedOrigins(value = process.env.CHAT_ALLOWED_ORIGINS) {
  const origins = (value ?? DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length ? origins : DEFAULT_ALLOWED_ORIGINS;
}

function createChatServer({ allowedOrigins, typingMode } = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins ?? getAllowedOrigins(),
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
  const users = new Map();
  const typingAdaptation = new TypingAdaptationService({ mode: typingMode ?? process.env.LNASF_MODE ?? "passive" });

  app.get("/", (_request, response) => {
    response.json({
      service: "socketio-express-chat",
      status: "ok",
      health: "/health",
      socketPath: "/socket.io",
    });
  });

  app.get("/lnasf/metrics", (_request, response) => {
    response.json(typingAdaptation.getSnapshot());
  });

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  io.on("connection", (socket) => {
    socket.on("user-join", (rawUsername) => {
      const username = normalizeUsername(rawUsername);
      if (!username) {
        socket.emit("chat-error", {
          code: "INVALID_USERNAME",
          message: "Choose a display name between 1 and 32 characters.",
        });
        return;
      }

      const previousUser = users.get(socket.id);
      if (previousUser?.username === username) {
        socket.emit("welcome", {
          message: `Welcome back to the chatroom, ${username}!`,
          users: [...users.values()].map((user) => user.username),
        });
        return;
      }

      if (previousUser) {
        socket.broadcast.emit("user-left", {
          username: previousUser.username,
          message: `${previousUser.username} left the chat`,
          time: new Date().toISOString(),
        });
      }

      users.set(socket.id, { username, joinedAt: new Date().toISOString() });
      if (!previousUser) {
        socket.broadcast.emit("user-joined", {
          username,
          message: `${username} joined the chat`,
          time: new Date().toISOString(),
        });
      } else {
        socket.broadcast.emit("user-joined", {
          username,
          message: `${username} joined the chat`,
          time: new Date().toISOString(),
        });
      }

      sendOnlineUsers(io, users);
      socket.emit("welcome", {
        message: `Welcome to the chatroom, ${username}!`,
        users: [...users.values()].map((user) => user.username),
      });
    });

    socket.on("send-message", (payload) => {
      const user = users.get(socket.id);
      const message = normalizeMessage(payload?.message);
      if (!user) {
        socket.emit("chat-error", {
          code: "JOIN_REQUIRED",
          message: "Join the chat before sending messages.",
        });
        return;
      }
      if (!message) {
        socket.emit("chat-error", {
          code: "INVALID_MESSAGE",
          message: "Messages must contain 1–2000 non-whitespace characters.",
        });
        return;
      }

      io.emit("new-message", {
        username: user.username,
        message,
        time: new Date().toISOString(),
        id: randomUUID(),
        senderId: socket.id,
      });
    });

    socket.on("typing-start", () => {
      const user = users.get(socket.id);
      if (!user) return;
      const decision = typingAdaptation.handleStart(socket.id);
      if (decision.broadcast) socket.broadcast.emit("user-typing", { username: user.username, isTyping: true });
    });

    socket.on("typing-stop", () => {
      const user = users.get(socket.id);
      if (!user) return;
      typingAdaptation.handleStop(socket.id);
      socket.broadcast.emit("user-typing", { username: user.username, isTyping: false });
    });

    socket.on("disconnect", () => {
      const user = users.get(socket.id);
      if (!user) return;

      users.delete(socket.id);
      typingAdaptation.remove(socket.id);
      io.emit("user-left", {
        username: user.username,
        message: `${user.username} left the chat`,
        time: new Date().toISOString(),
      });
      sendOnlineUsers(io, users);
    });
  });

  return { app, server, io, users };
}

function sendOnlineUsers(io, users) {
  io.emit("online-users", [...users.values()].map((user) => user.username));
}

function startServer() {
  const port = Number.parseInt(process.env.PORT ?? "5000", 10);
  const { server } = createChatServer();
  server.listen(port, () => {
    console.log(`Socket.IO chat backend listening on port ${port}`);
  });
}

if (require.main === module) startServer();

module.exports = { createChatServer, getAllowedOrigins, startServer };
