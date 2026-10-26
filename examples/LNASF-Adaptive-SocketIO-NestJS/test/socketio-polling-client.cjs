const { setTimeout: delay } = require("node:timers/promises");

class SocketIoPollingClient {
  constructor(baseUrl, { timeoutMs = 5000 } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
    this.sid = null;
    this.events = [];
    this.waiters = [];
    this.closed = false;
    this.pollController = null;
    this.pollTask = null;
    this.pollError = null;
  }

  endpoint() {
    const url = new URL("/socket.io/", this.baseUrl);
    url.searchParams.set("EIO", "4");
    url.searchParams.set("transport", "polling");
    if (this.sid) url.searchParams.set("sid", this.sid);
    url.searchParams.set("t", String(Date.now()));
    return url;
  }

  async post(packet) {
    const response = await fetch(this.endpoint(), {
      method: "POST",
      headers: { "content-type": "text/plain;charset=UTF-8" },
      body: packet,
    });
    if (!response.ok) {
      throw new Error(`Socket.IO polling POST failed with HTTP ${response.status}: ${await response.text()}`);
    }
    return response.text();
  }

  async connect() {
    const response = await fetch(this.endpoint());
    if (!response.ok) throw new Error(`Engine.IO handshake failed with HTTP ${response.status}`);
    const packet = (await response.text()).split("\x1e")[0] ?? "";
    if (!packet.startsWith("0")) throw new Error(`Unexpected Engine.IO handshake packet: ${packet}`);
    const handshake = JSON.parse(packet.slice(1));
    if (typeof handshake.sid !== "string" || !handshake.sid) {
      throw new Error("Engine.IO handshake did not contain a session id");
    }
    this.sid = handshake.sid;
    await this.post("40");
    this.pollTask = this.pollLoop().catch((error) => {
      if (this.closed) return;
      this.pollError = error;
      for (const waiter of this.waiters.splice(0)) {
        clearTimeout(waiter.timer);
        waiter.reject(error);
      }
    });
    await this.waitFor("connect");
    return this;
  }

  async pollLoop() {
    while (!this.closed) {
      this.pollController = new AbortController();
      let response;
      try {
        response = await fetch(this.endpoint(), { signal: this.pollController.signal });
      } catch (error) {
        if (this.closed) return;
        throw error;
      }
      if (!response.ok) {
        if (this.closed) return;
        throw new Error(`Engine.IO polling GET failed with HTTP ${response.status}`);
      }
      const body = await response.text();
      for (const packet of body.split("\x1e").filter(Boolean)) {
        if (packet === "2") {
          await this.post("3");
        } else if (packet === "1") {
          this.closed = true;
          return;
        } else if (packet === "40" || packet.startsWith("40{")) {
          this.publish("connect", packet.length > 2 ? JSON.parse(packet.slice(2)) : undefined);
        } else if (packet.startsWith("42")) {
          const payload = JSON.parse(packet.slice(2));
          if (Array.isArray(payload) && typeof payload[0] === "string") this.publish(payload[0], payload[1]);
        }
      }
    }
  }

  publish(name, payload) {
    const index = this.waiters.findIndex((waiter) => waiter.name === name && waiter.predicate(payload));
    if (index >= 0) {
      const [waiter] = this.waiters.splice(index, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(payload);
      return;
    }
    this.events.push({ name, payload });
  }

  waitFor(name, predicate = () => true, timeoutMs = this.timeoutMs) {
    const index = this.events.findIndex((event) => event.name === name && predicate(event.payload));
    if (index >= 0) {
      const [event] = this.events.splice(index, 1);
      return Promise.resolve(event.payload);
    }
    if (this.pollError) return Promise.reject(this.pollError);
    return new Promise((resolve, reject) => {
      const waiter = {
        name,
        predicate,
        resolve,
        reject,
        timer: setTimeout(() => {
          const current = this.waiters.indexOf(waiter);
          if (current >= 0) this.waiters.splice(current, 1);
          reject(new Error(`Timed out waiting for Socket.IO event "${name}"`));
        }, timeoutMs),
      };
      this.waiters.push(waiter);
    });
  }

  async emit(name, ...args) {
    if (!this.sid || this.closed) throw new Error("Socket.IO polling client is not connected");
    await this.post(`42${JSON.stringify([name, ...args])}`);
  }

  count(name, predicate = () => true) {
    return this.events.filter((event) => event.name === name && predicate(event.payload)).length;
  }

  async close() {
    if (this.closed) {
      this.pollController?.abort();
      return;
    }
    try {
      if (this.sid) await this.post("41");
    } catch {
      // The server may already have closed this Engine.IO session.
    }
    this.closed = true;
    this.pollController?.abort();
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error("Socket.IO polling client was closed"));
    }
    await this.pollTask?.catch(() => undefined);
  }
}

module.exports = { SocketIoPollingClient };
