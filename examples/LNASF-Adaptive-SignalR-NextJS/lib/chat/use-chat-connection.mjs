"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { chatConfig } from "./config.mjs";
import { normalizeMessage, normalizeUsername } from "./protocol.mjs";
import { chatReducer, CONNECTION_STATUS, createMessage, initialChatState } from "./reducer.mjs";
import { createChatConnection } from "./signalr-client.mjs";

const safeError = (error, fallback) => error instanceof Error && error.message ? error.message : fallback;

export function useChatConnection() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const connectionRef = useRef(null);
  const usernameRef = useRef("");
  const typingTimeoutRef = useRef(null);
  const intentionalStopRef = useRef(false);
  const retryPolicyRef = useRef(null);

  const addSystemMessage = useCallback((message) => {
    const next = createMessage({ username: "System", message, type: "system" });
    if (next) dispatch({ type: "message", message: next });
  }, []);

  const clearTypingTimer = useCallback(() => {
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
  }, []);

  const stop = useCallback(async () => {
    intentionalStopRef.current = true;
    clearTypingTimer();
    const connection = connectionRef.current;
    connectionRef.current = null;
    usernameRef.current = "";
    retryPolicyRef.current?.recordAbandoned();
    retryPolicyRef.current = null;
    if (connection) {
      connection.off("welcome"); connection.off("user-joined"); connection.off("user-left");
      connection.off("new-message"); connection.off("online-users"); connection.off("user-typing");
      try { await connection.stop(); } catch { /* stop is best effort during teardown */ }
    }
    dispatch({ type: "reset" });
  }, [clearTypingTimer]);

  const connect = useCallback(async (rawUsername) => {
    const username = normalizeUsername(rawUsername);
    if (!username) return { ok: false, error: `Enter a display name of 1–${chatConfig.maxUsernameLength} characters.` };
    if (connectionRef.current) return { ok: false, error: "A connection is already in progress." };

    intentionalStopRef.current = false;
    usernameRef.current = username;
    dispatch({ type: "status", status: CONNECTION_STATUS.CONNECTING });
    const { connection, retryPolicy } = createChatConnection(chatConfig.hubUrl, {
      mode: chatConfig.lnasfMode,
      onMetricsChange: (metrics) => dispatch({ type: "retryMetrics", metrics }),
    });
    retryPolicyRef.current = retryPolicy;
    dispatch({ type: "retryMetrics", metrics: retryPolicy.getSnapshot() });
    connectionRef.current = connection;

    const isOwn = (sender) => sender === usernameRef.current;
    connection.on("welcome", (data = {}) => {
      dispatch({ type: "users", users: data.users });
      if (typeof data.message === "string") addSystemMessage(data.message);
    });
    connection.on("user-joined", (data = {}) => { if (typeof data.message === "string") addSystemMessage(data.message); });
    connection.on("user-left", (data = {}) => { if (typeof data.message === "string") addSystemMessage(data.message); });
    connection.on("online-users", (users) => dispatch({ type: "users", users }));
    connection.on("new-message", (data = {}) => {
      const message = createMessage({ ...data, isOwn: isOwn(data.username) });
      if (message) dispatch({ type: "message", message });
    });
    connection.on("user-typing", (data = {}) => {
      dispatch({ type: "typing", username: data.isTyping && !isOwn(data.username) ? data.username : null });
    });
    connection.onreconnecting(() => dispatch({ type: "status", status: CONNECTION_STATUS.RECONNECTING }));
    connection.onreconnected(async () => {
      retryPolicy.recordSuccess();
      dispatch({ type: "status", status: CONNECTION_STATUS.CONNECTED });
      try {
        await connection.invoke("UserJoin", usernameRef.current);
        addSystemMessage("Connection restored.");
      } catch {
        dispatch({ type: "status", status: CONNECTION_STATUS.FAILED, error: "The connection was restored but rejoining the room failed." });
      }
    });
    connection.onclose((error) => {
      if (!intentionalStopRef.current) {
        connectionRef.current = null;
        retryPolicy.recordTerminalFailure();
        dispatch({ type: "status", status: CONNECTION_STATUS.FAILED, error: safeError(error, "The chat connection closed unexpectedly.") });
      } else {
        retryPolicy.recordAbandoned();
      }
    });

    try {
      await connection.start();
      await connection.invoke("UserJoin", username);
      dispatch({ type: "status", status: CONNECTION_STATUS.CONNECTED });
      addSystemMessage("You joined the conversation.");
      return { ok: true };
    } catch (error) {
      connectionRef.current = null;
      retryPolicy.recordAbandoned();
      retryPolicyRef.current = null;
      try { await connection.stop(); } catch { /* startup failure already handled */ }
      dispatch({ type: "status", status: CONNECTION_STATUS.FAILED, error: "Unable to reach the chat service. Check that the hub is running and try again." });
      return { ok: false, error: safeError(error, "Unable to connect.") };
    }
  }, [addSystemMessage]);

  const sendMessage = useCallback(async (rawMessage) => {
    const message = normalizeMessage(rawMessage);
    const connection = connectionRef.current;
    if (!message || !connection || state.status !== CONNECTION_STATUS.CONNECTED) return { ok: false };
    try {
      await connection.invoke("SendMessage", message);
      await connection.invoke("TypingStop");
      return { ok: true };
    } catch {
      addSystemMessage("Your message could not be sent. Please try again.");
      return { ok: false };
    }
  }, [addSystemMessage, state.status]);

  const notifyTyping = useCallback(() => {
    const connection = connectionRef.current;
    if (!connection || state.status !== CONNECTION_STATUS.CONNECTED) return;
    void connection.invoke("TypingStart").catch(() => undefined);
    clearTypingTimer();
    typingTimeoutRef.current = window.setTimeout(() => {
      void connection.invoke("TypingStop").catch(() => undefined);
      typingTimeoutRef.current = null;
    }, chatConfig.typingTimeoutMs);
  }, [clearTypingTimer, state.status]);

  useEffect(() => () => { void stop(); }, [stop]);
  return { ...state, connect, stop, sendMessage, notifyTyping };
}
