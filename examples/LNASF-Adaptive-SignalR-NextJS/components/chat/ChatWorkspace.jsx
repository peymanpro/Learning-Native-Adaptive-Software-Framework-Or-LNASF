"use client";

import { useEffect, useRef, useState } from "react";
import { chatConfig } from "@/lib/chat/config.mjs";
import { CONNECTION_STATUS, formatTime } from "@/lib/chat/reducer.mjs";
import { useChatConnection } from "@/lib/chat/use-chat-connection.mjs";
import styles from "./chat-workspace.module.css";

const statusCopy = {
  [CONNECTION_STATUS.DISCONNECTED]: "Ready to connect",
  [CONNECTION_STATUS.CONNECTING]: "Connecting to chat",
  [CONNECTION_STATUS.CONNECTED]: "Live connection",
  [CONNECTION_STATUS.RECONNECTING]: "Reconnecting",
  [CONNECTION_STATUS.FAILED]: "Connection needs attention",
};

function Participants({ users, onClose }) {
  return <aside className={styles.participants} aria-label="Participants">
    <div className={styles.panelHeader}><div><p className={styles.eyebrow}>Room presence</p><h2>Participants <span>{users.length}</span></h2></div>{onClose && <button className={styles.iconButton} onClick={onClose} aria-label="Close participants">×</button>}</div>
    {users.length ? <ul className={styles.userList}>{users.map((user) => <li key={user}><span aria-hidden="true" className={styles.avatar}>{user.slice(0, 1).toUpperCase()}</span><span title={user}>{user}</span><i aria-label="Online" /></li>)}</ul> : <p className={styles.emptyUsers}>No participant roster received yet.</p>}
  </aside>;
}

export default function ChatWorkspace() {
  const { status, messages, users, typingUser, error, retryMetrics, connect, stop, sendMessage, notifyTyping } = useChatConnection();
  const [username, setUsername] = useState("");
  const [draft, setDraft] = useState("");
  const [joinError, setJoinError] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const endRef = useRef(null);
  const joined = status !== CONNECTION_STATUS.DISCONNECTED && status !== CONNECTION_STATUS.FAILED;
  const canSend = status === CONNECTION_STATUS.CONNECTED && draft.trim().length > 0;

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end", behavior: messages.length > 1 ? "smooth" : "auto" }); }, [messages, typingUser]);

  async function handleJoin(event) {
    event.preventDefault(); setJoinError("");
    const result = await connect(username);
    if (!result.ok) setJoinError(result.error);
  }
  async function handleSend(event) {
    event.preventDefault(); if (!canSend) return;
    const sent = await sendMessage(draft);
    if (sent.ok) setDraft("");
  }
  async function leave() { await stop(); setDraft(""); setShowParticipants(false); }

  return <main className={styles.page}>
    <section className={styles.shell} aria-label="SignalR chat client">
      <header className={styles.header}>
        <div className={styles.brand}><span className={styles.brandMark} aria-hidden="true">S</span><div><p className={styles.eyebrow}>Realtime workspace</p><h1>SignalR Chat</h1></div></div>
        <div className={styles.headerActions}><div className={`${styles.status} ${styles[status]}`} role="status" aria-live="polite"><span aria-hidden="true" />{statusCopy[status]}</div>{joined && <><button className={styles.mobileUsers} onClick={() => setShowParticipants(true)} aria-label="Show participants">People <b>{users.length}</b></button><button className={styles.leave} onClick={leave}>Leave</button></>}</div>
      </header>
      {status === CONNECTION_STATUS.RECONNECTING && <div className={styles.notice} role="status">Messages are paused while we restore your connection.</div>}
      {retryMetrics && <p className={styles.eyebrow} aria-label="LNASF retry diagnostics">LNASF {retryMetrics.mode} · {retryMetrics.model.reduce((sum, item) => sum + item.attempts, 0)} retry outcomes · {retryMetrics.lastDecision?.action ?? "baseline"} policy</p>}
      {status === CONNECTION_STATUS.FAILED && <div className={styles.errorNotice} role="alert"><strong>Connection unavailable.</strong> {error} <button onClick={() => void connect(username)}>Try again</button></div>}
      {!joined ? <section className={styles.join} aria-labelledby="join-title"><div className={styles.joinIntro}><p className={styles.eyebrow}>A dependable demo</p><h2 id="join-title">Join the conversation with confidence.</h2><p>Connection state, presence, typing, and messages are managed independently so the interface stays honest when the network changes.</p></div><form onSubmit={handleJoin} className={styles.joinForm}><label htmlFor="username">Display name</label><input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. Avery Chen" autoComplete="nickname" maxLength={chatConfig.maxUsernameLength} disabled={status === CONNECTION_STATUS.CONNECTING} aria-describedby={joinError ? "join-error" : undefined} /><button type="submit" disabled={status === CONNECTION_STATUS.CONNECTING}>{status === CONNECTION_STATUS.CONNECTING ? "Connecting…" : "Join chat"}</button>{joinError && <p id="join-error" className={styles.formError} role="alert">{joinError}</p>}<p className={styles.formHint}>Hub: <code>{chatConfig.hubUrl}</code></p></form></section> : <div className={styles.workspace}><section className={styles.conversation} aria-label="Conversation"><div className={styles.conversationHeader}><div><p className={styles.eyebrow}>Public room</p><h2>Team conversation</h2></div><p>{users.length} online</p></div><div className={styles.messages} aria-live="polite" aria-relevant="additions text">{messages.length === 0 ? <div className={styles.empty}><span aria-hidden="true">◌</span><h3>Waiting for the first message</h3><p>Say hello when the connection is ready.</p></div> : messages.map((item) => item.type === "system" ? <p key={item.id} className={styles.systemMessage}>{item.message}</p> : <article key={item.id} className={`${styles.message} ${item.isOwn ? styles.own : ""}`}><div className={styles.messageMeta}><strong>{item.isOwn ? "You" : item.username}</strong><time dateTime={item.time}>{formatTime(item.time)}</time></div><p>{item.message}</p></article>)}{typingUser && <p className={styles.typing} aria-live="polite"><span aria-hidden="true">•••</span> {typingUser} is typing</p>}<div ref={endRef} /></div><form className={styles.composer} onSubmit={handleSend}><label className="srOnly" htmlFor="message">Message</label><textarea id="message" value={draft} onChange={(event) => { setDraft(event.target.value); notifyTyping(); }} placeholder={status === CONNECTION_STATUS.RECONNECTING ? "Reconnecting…" : "Write a message"} maxLength={chatConfig.maxMessageLength} disabled={status !== CONNECTION_STATUS.CONNECTED} rows={1} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button type="submit" disabled={!canSend} aria-label="Send message">Send</button><p>{draft.length}/{chatConfig.maxMessageLength} · Enter to send, Shift + Enter for a new line</p></form></section><Participants users={users} /></div>}
    </section>
    {showParticipants && <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Participants"><button className={styles.backdrop} onClick={() => setShowParticipants(false)} aria-label="Close participants" /><Participants users={users} onClose={() => setShowParticipants(false)} /></div>}
  </main>;
}
