const test = require("node:test");
const assert = require("node:assert/strict");
const { createChatServer } = require("../server");
const { SocketIoPollingClient } = require("./socketio-polling-client.cjs");

test("adaptive typing suppression is wired through live Socket.IO transport without suppressing stop or chat messages", async () => {
  const { server, io } = createChatServer({
    allowedOrigins: ["http://localhost:3000"],
    typingMode: "adaptive",
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const first = new SocketIoPollingClient(baseUrl);
  const second = new SocketIoPollingClient(baseUrl);

  try {
    await Promise.all([first.connect(), second.connect()]);
    await first.emit("user-join", "Ada");
    await first.waitFor("welcome");
    await second.emit("user-join", "Ben");
    await second.waitFor("welcome");

    const burstSize = 12;
    for (let index = 0; index < burstSize; index += 1) {
      await first.emit("typing-start");
    }

    const stopReceived = second.waitFor("user-typing", (event) => event?.isTyping === false);
    await first.emit("typing-stop");
    await stopReceived;

    await first.emit("send-message", { message: "The primary chat path must remain deterministic." });
    const deliveredMessage = await second.waitFor(
      "new-message",
      (event) => event?.message === "The primary chat path must remain deterministic.",
    );

    const metricsResponse = await fetch(`${baseUrl}/lnasf/metrics`);
    assert.equal(metricsResponse.status, 200);
    const metrics = await metricsResponse.json();
    assert.equal(metrics.mode, "adaptive");
    assert.equal(metrics.measurement.typingStartReceived, burstSize);
    assert.ok(metrics.measurement.typingStartSuppressed > 0);
    assert.ok(metrics.measurement.typingStartBroadcast < burstSize);
    assert.equal(metrics.measurement.typingStopBroadcast, 1);
    assert.equal(deliveredMessage.username, "Ada");
    assert.ok(deliveredMessage.id);
  } finally {
    await Promise.all([first.close(), second.close()]);
    await new Promise((resolve) => io.close(resolve));
  }
});
