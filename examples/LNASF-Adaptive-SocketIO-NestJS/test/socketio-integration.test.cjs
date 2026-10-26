const test = require("node:test");
const assert = require("node:assert/strict");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/app.module");
const { SocketIoPollingClient } = require("./socketio-polling-client.cjs");

test("adaptive typing suppression is wired through live NestJS Socket.IO transport without suppressing stop or chat messages", async () => {
  const previousMode = process.env.LNASF_MODE;
  process.env.LNASF_MODE = "adaptive";
  const app = await NestFactory.create(AppModule, { logger: false });
  const first = new SocketIoPollingClient("http://127.0.0.1:0");
  const second = new SocketIoPollingClient("http://127.0.0.1:0");

  try {
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    first.baseUrl = baseUrl;
    second.baseUrl = baseUrl;

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
    await app.close();
    if (previousMode === undefined) delete process.env.LNASF_MODE;
    else process.env.LNASF_MODE = previousMode;
  }
});
