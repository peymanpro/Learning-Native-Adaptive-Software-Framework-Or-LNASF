import assert from "node:assert/strict";
import test from "node:test";
import { createChatConnection } from "../lib/chat/signalr-client.mjs";

function waitForEvent(connection, eventName, predicate = () => true, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error(`Timed out waiting for SignalR event: ${eventName}`)), timeoutMs);
    const handler = (payload) => {
      if (!predicate(payload)) return;
      finish(null, payload);
    };
    function finish(error, payload) {
      clearTimeout(timeout);
      connection.off(eventName, handler);
      if (error) reject(error);
      else resolve(payload);
    }
    connection.on(eventName, handler);
  });
}

test("two Next.js SignalR client connections exchange chat and typing events through the live ASP.NET Core Hub", async (t) => {
  const hubUrl = process.env.LNASF_LIVE_HUB_URL;
  if (!hubUrl) {
    t.skip("Set LNASF_LIVE_HUB_URL to run the live Hub integration test.");
    return;
  }

  const first = createChatConnection(hubUrl, { mode: "passive" });
  const second = createChatConnection(hubUrl, { mode: "passive" });
  const clients = [first.connection, second.connection];

  try {
    await Promise.all(clients.map((connection) => connection.start()));

    const welcomeA = waitForEvent(first.connection, "welcome", (data) => data?.message?.includes("AdaLive"));
    await first.connection.invoke("UserJoin", "AdaLive");
    assert.match((await welcomeA).message, /AdaLive/);

    const welcomeB = waitForEvent(second.connection, "welcome", (data) => data?.message?.includes("BenLive"));
    const joinedB = waitForEvent(first.connection, "user-joined", (data) => data?.username === "BenLive");
    await second.connection.invoke("UserJoin", "BenLive");
    assert.match((await welcomeB).message, /BenLive/);
    await joinedB;

    const delivered = waitForEvent(
      second.connection,
      "new-message",
      (data) => data?.message === "Live SignalR integration message" && data?.username === "AdaLive",
    );
    await first.connection.invoke("SendMessage", "Live SignalR integration message");
    const message = await delivered;
    assert.equal(message.message, "Live SignalR integration message");
    assert.equal(message.username, "AdaLive");
    assert.equal(typeof message.id, "string");
    assert.ok(message.id.length > 0);

    const typing = waitForEvent(
      second.connection,
      "user-typing",
      (data) => data?.username === "AdaLive" && data?.isTyping === true,
    );
    await first.connection.invoke("TypingStart");
    assert.equal((await typing).isTyping, true);

    const stoppedTyping = waitForEvent(
      second.connection,
      "user-typing",
      (data) => data?.username === "AdaLive" && data?.isTyping === false,
    );
    await first.connection.invoke("TypingStop");
    assert.equal((await stoppedTyping).isTyping, false);
  } finally {
    await Promise.all(clients.map(async (connection) => {
      try { await connection.stop(); } catch { /* best-effort integration teardown */ }
    }));
  }
});
