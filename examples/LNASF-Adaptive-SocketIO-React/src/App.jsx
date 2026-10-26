import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { normalizeMessage, normalizeUsername } from "./chatProtocol";
import { appendRetainedMessage } from "./chatMessageHistory";
import { AdaptiveRetryPolicy, isRetryableFailure, isRetryableDisconnectReason } from "./lnasf/retryPolicy";
import "./App.css";

const SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || "http://localhost:5000";
const LNASF_MODE = import.meta.env.VITE_LNASF_MODE || "passive";

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [chatError, setChatError] = useState("");
  const [username, setUsername] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const usernameRef = useRef("");
  const hasJoinedRef = useRef(false);
  const reconnectTimerRef = useRef(null);
  const retryNowRef = useRef(null);
  const retryPolicyRef = useRef(null);
  const everConnectedRef = useRef(false);
  const [retryMetrics, setRetryMetrics] = useState(null);

  useEffect(() => {
    let alive = true;
    const retryPolicy = new AdaptiveRetryPolicy({
      mode: LNASF_MODE,
      onMetricsChange: (metrics) => { if (alive) setRetryMetrics(metrics); },
    });
    retryPolicyRef.current = retryPolicy;
    const newSocket = io(SERVER_URL, { autoConnect: false, reconnection: false });
    setSocket(newSocket);

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    };

    const scheduleReconnect = () => {
      if (!alive || reconnectTimerRef.current !== null) return;
      const delay = retryPolicy.nextRetryDelay();
      if (delay === null) {
        setConnectionError("The reconnect budget is exhausted. Select Retry connection to begin a new bounded attempt window.");
        return;
      }
      setConnectionError(`Connection interrupted. Next retry in ${delay} ms (LNASF ${retryPolicy.mode}).`);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (alive) newSocket.connect();
      }, delay);
    };

    retryNowRef.current = () => {
      clearReconnectTimer();
      retryPolicy.resetEpisode();
      setConnectionError("");
      newSocket.connect();
    };

    newSocket.on("connect", () => {
      const hadConnection = everConnectedRef.current;
      everConnectedRef.current = true;
      if (retryPolicy.getSnapshot().lastDecision?.selectedDelayMs !== null && retryPolicy.getSnapshot().lastDecision !== null) {
        retryPolicy.recordSuccess();
      } else {
        retryPolicy.recordAbandoned();
      }
      setIsConnected(true);
      setConnectionError("");
      if (hasJoinedRef.current && usernameRef.current) newSocket.emit("user-join", usernameRef.current);
      if (!hadConnection) setRetryMetrics(retryPolicy.getSnapshot());
    });
    newSocket.on("disconnect", (reason) => {
      setIsConnected(false);
      setTypingUsers([]);
      if (reason === "io server disconnect") {
        clearReconnectTimer();
        retryPolicy.recordNonRetryableFailure("The Socket.IO server intentionally disconnected this client; automatic retries are disabled.");
        setConnectionError("The server intentionally disconnected this client. Select Retry connection if appropriate.");
        return;
      }
      if (isRetryableDisconnectReason(reason)) scheduleReconnect();
    });
    newSocket.on("connect_error", (error) => {
      setIsConnected(false);
      if (!isRetryableFailure(error)) {
        clearReconnectTimer();
        retryPolicy.recordNonRetryableFailure();
        setConnectionError("The server rejected this connection. Check the endpoint or credentials before retrying.");
        return;
      }
      setConnectionError("Unable to connect to the chat server. The reconnect policy will retry within its limits.");
      scheduleReconnect();
    });

    newSocket.connect();
    return () => {
      alive = false;
      clearReconnectTimer();
      retryPolicy.recordAbandoned();
      retryPolicyRef.current = null;
      retryNowRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onWelcome = (data = {}) => {
      if (typeof data.message === "string") {
        setMessages((previous) => appendRetainedMessage(previous, {
          type: "system",
          text: data.message,
          time: new Date().toLocaleTimeString("fa-IR"),
      }));
      }
      setOnlineUsers(Array.isArray(data.users) ? data.users.map(normalizeUsername).filter(Boolean) : []);
      setChatError("");
    };
    const onNewMessage = (data = {}) => {
      const text = normalizeMessage(data.message);
      const sender = normalizeUsername(data.username);
      if (!text || !sender) return;
      setMessages((previous) => appendRetainedMessage(previous, {
        type: "message",
        username: sender,
        text,
        time: typeof data.time === "string" ? data.time : new Date().toISOString(),
        id: typeof data.id === "string" ? data.id : `message-${Date.now()}`,
        senderId: typeof data.senderId === "string" ? data.senderId : null,
      }));
    };
    const onSystemEvent = (data = {}) => {
      if (typeof data.message !== "string") return;
      setMessages((previous) => appendRetainedMessage(previous, {
        type: "system",
        text: data.message,
        time: typeof data.time === "string" ? data.time : new Date().toISOString(),
      }));
    };
    const onOnlineUsers = (users) => {
      setOnlineUsers(Array.isArray(users) ? users.map(normalizeUsername).filter(Boolean) : []);
    };
    const onTyping = (data = {}) => {
      const sender = normalizeUsername(data.username);
      if (!sender) return;
      setTypingUsers((previous) => data.isTyping
        ? (previous.includes(sender) ? previous : [...previous, sender])
        : previous.filter((name) => name !== sender));
    };
    const onChatError = (error = {}) => {
      setChatError(typeof error.message === "string" ? error.message : "The server rejected that action.");
    };

    socket.on("welcome", onWelcome);
    socket.on("new-message", onNewMessage);
    socket.on("user-joined", onSystemEvent);
    socket.on("user-left", onSystemEvent);
    socket.on("online-users", onOnlineUsers);
    socket.on("user-typing", onTyping);
    socket.on("chat-error", onChatError);

    return () => {
      socket.off("welcome", onWelcome);
      socket.off("new-message", onNewMessage);
      socket.off("user-joined", onSystemEvent);
      socket.off("user-left", onSystemEvent);
      socket.off("online-users", onOnlineUsers);
      socket.off("user-typing", onTyping);
      socket.off("chat-error", onChatError);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoin = (event) => {
    event.preventDefault();
    const cleanUsername = normalizeUsername(username);
    if (!cleanUsername) {
      setChatError("Choose a display name between 1 and 32 characters.");
      return;
    }
    if (!socket || !isConnected) {
      setChatError("The server is not connected yet.");
      return;
    }

    usernameRef.current = cleanUsername;
    hasJoinedRef.current = true;
    setUsername(cleanUsername);
    socket.emit("user-join", cleanUsername);
    setHasJoined(true);
    setChatError("");
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const message = normalizeMessage(inputMessage);
    if (!message) {
      setChatError("Messages must contain 1–2000 valid characters.");
      return;
    }
    if (!socket || !isConnected || !hasJoinedRef.current) {
      setChatError("Reconnect to the chat before sending a message.");
      return;
    }

    socket.emit("send-message", { message });
    setInputMessage("");
    setChatError("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
    socket.emit("typing-stop");
  };

  const handleTyping = (value) => {
    if (!socket || !isConnected || !hasJoinedRef.current) return;
    if (!value.trim()) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
      socket.emit("typing-stop");
      return;
    }

    socket.emit("typing-start");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing-stop");
      typingTimeoutRef.current = null;
    }, 1000);
  };

  if (!hasJoined) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>public chatroom</h1>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="please enter your name"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              maxLength={32}
              required
            />
            <button type="submit" disabled={!isConnected}>
              {isConnected ? "Join Chat" : "Connecting..."}
            </button>
          </form>
          {!isConnected && <p className="error">{connectionError || "Connecting to server..."}</p>}
          {!isConnected && connectionError && <button type="button" onClick={() => retryNowRef.current?.()}>Retry connection</button>}
          {retryMetrics && <p className="lnasf-diagnostics">LNASF {retryMetrics.mode} · {retryMetrics.model.reduce((sum, item) => sum + item.attempts, 0)} retry outcomes · {retryMetrics.lastDecision?.action || "baseline"} policy</p>}
          {chatError && <p className="error" role="alert">{chatError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>online({onlineUsers.length})</h3>
        </div>
        <div className="online-users">
          {onlineUsers.map((user) => (
            <div key={user} className="user-item">
              <span className="online-dot"></span>
              {user}
              {user === username && <span className="you-badge"> (You)</span>}
            </div>
          ))}
        </div>
      </aside>

      <main className="chat-main">
        <div className="chat-header">
          <h2>Public Chat</h2>
          <div className="connection-status">{isConnected ? "Online" : "Offline"}</div>
          {retryMetrics && <small className="lnasf-diagnostics">LNASF {retryMetrics.mode} · {retryMetrics.model.reduce((sum, item) => sum + item.attempts, 0)} retry outcomes · {retryMetrics.lastDecision?.action || "baseline"}</small>}
        </div>
        {connectionError && !isConnected && <p className="error" role="status">{connectionError}</p>}
        {connectionError && !isConnected && <button type="button" onClick={() => retryNowRef.current?.()}>Retry connection</button>}
        {chatError && <p className="error" role="alert">{chatError}</p>}

        <div className="messages-area">
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`message ${message.type === "system" ? "system-message" : "user-message"} ${message.senderId === socket?.id ? "my-message" : ""}`}
            >
              {message.type === "message" ? (
                <>
                  <div className="message-header">
                    <strong className="username">{message.username}</strong>
                    <span className="time">{message.time}</span>
                  </div>
                  <div className="message-text">{message.text}</div>
                </>
              ) : (
                <div className="system-text">
                  <em>{message.text}</em>
                  <span className="time">{message.time}</span>
                </div>
              )}
            </div>
          ))}

          {typingUsers.length > 0 && (
            <div className="typing-indicator">{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={sendMessage}>
          <input
            type="text"
            placeholder="پیام خود را بنویسید..."
            value={inputMessage}
            onChange={(event) => {
              const value = event.target.value;
              setInputMessage(value);
              handleTyping(value);
            }}
            maxLength={2000}
          />
          <button type="submit" disabled={!isConnected || !inputMessage.trim()}>Send</button>
        </form>
      </main>
    </div>
  );
}

export default App;
