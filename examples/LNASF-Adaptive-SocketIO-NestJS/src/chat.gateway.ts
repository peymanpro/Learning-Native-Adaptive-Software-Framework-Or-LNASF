import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { randomUUID } from "node:crypto";
import { Server, Socket } from "socket.io";
import { getAllowedOrigins } from "./chat-config";
import { normalizeMessage, normalizeUsername } from "./chat-validation";
import { TypingAdaptationService } from "./lnasf/typing-adaptation";

type ChatUser = { username: string; joinedAt: string };

@WebSocketGateway({
  cors: {
    origin: getAllowedOrigins(),
    methods: ["GET", "POST"],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  io!: Server;

  constructor(private readonly typingAdaptation: TypingAdaptationService) {}

  private readonly users = new Map<string, ChatUser>();

  handleConnection(socket: Socket) {
    console.log(`Socket.IO connection established: ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    const user = this.users.get(socket.id);
    this.typingAdaptation.remove(socket.id);
    if (!user) return;

    this.users.delete(socket.id);
    this.io.emit("user-left", {
      username: user.username,
      message: `${user.username} left the chat`,
      time: new Date().toISOString(),
    });
    this.sendOnlineUsers();
  }

  @SubscribeMessage("user-join")
  handleUserJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() rawUsername: unknown,
  ) {
    const username = normalizeUsername(rawUsername);
    if (!username) {
      socket.emit("chat-error", {
        code: "INVALID_USERNAME",
        message: "Choose a display name between 1 and 32 characters.",
      });
      return;
    }

    const previousUser = this.users.get(socket.id);
    if (previousUser?.username === username) {
      socket.emit("welcome", {
        message: `Welcome back to the chatroom, ${username}!`,
        users: [...this.users.values()].map((user) => user.username),
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

    this.users.set(socket.id, { username, joinedAt: new Date().toISOString() });
    socket.broadcast.emit("user-joined", {
      username,
      message: `${username} joined the chat`,
      time: new Date().toISOString(),
    });
    this.sendOnlineUsers();
    socket.emit("welcome", {
      message: `Welcome to the chatroom, ${username}!`,
      users: [...this.users.values()].map((user) => user.username),
    });
  }

  @SubscribeMessage("send-message")
  handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { message?: unknown } | null,
  ) {
    const user = this.users.get(socket.id);
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

    this.io.emit("new-message", {
      username: user.username,
      message,
      time: new Date().toISOString(),
      id: randomUUID(),
      senderId: socket.id,
    });
  }

  @SubscribeMessage("typing-start")
  handleTypingStart(@ConnectedSocket() socket: Socket) {
    this.broadcastTyping(socket, true);
  }

  @SubscribeMessage("typing-stop")
  handleTypingStop(@ConnectedSocket() socket: Socket) {
    this.broadcastTyping(socket, false);
  }

  private broadcastTyping(socket: Socket, isTyping: boolean) {
    const user = this.users.get(socket.id);
    if (!user) return;
    if (!isTyping) {
      this.typingAdaptation.handleStop(socket.id);
      socket.broadcast.emit("user-typing", { username: user.username, isTyping: false });
      return;
    }
    const decision = this.typingAdaptation.handleStart(socket.id);
    if (decision.broadcast) socket.broadcast.emit("user-typing", { username: user.username, isTyping: true });
  }

  private sendOnlineUsers() {
    this.io.emit("online-users", [...this.users.values()].map((user) => user.username));
  }
}
