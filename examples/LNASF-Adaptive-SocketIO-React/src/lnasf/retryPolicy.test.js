import { AdaptiveRetryPolicy, RetryOutcomeModel, isRetryableFailure, isRetryableDisconnectReason } from "./retryPolicy";

test("learns actual retry outcomes and exposes confidence and utility", () => {
  const model = new RetryOutcomeModel();
  model.observe(0, true, 400);
  model.observe(0, true, 350);
  model.observe(0, false);
  expect(model.estimate(0).attempts).toBe(3);
  expect(model.estimate(0).successProbability).toBe(3 / 5);
  expect(model.predictBest().delayMs).toBe(0);
});

test("passive mode learns a recommendation but retains the baseline", () => {
  const model = new RetryOutcomeModel();
  for (let index = 0; index < 8; index += 1) model.observe(2000, true);
  for (let index = 0; index < 8; index += 1) model.observe(5000, false);
  const policy = new AdaptiveRetryPolicy({ mode: "passive", model, now: () => 1000 });
  expect(policy.nextRetryDelay({ previousRetryCount: 2, elapsedMilliseconds: 1000 })).toBe(5000);
  expect(policy.getSnapshot().lastDecision.action).toBe("baseline");
  expect(policy.getSnapshot().lastDecision.recommendedDelayMs).toBe(2000);
});

test("advisory mode reports an alternative without applying it", () => {
  const model = new RetryOutcomeModel();
  for (let index = 0; index < 8; index += 1) model.observe(2000, true);
  for (let index = 0; index < 8; index += 1) model.observe(5000, false);
  const policy = new AdaptiveRetryPolicy({ mode: "advisory", model, now: () => 1000 });
  expect(policy.nextRetryDelay({ previousRetryCount: 2, elapsedMilliseconds: 1000 })).toBe(5000);
  expect(policy.getSnapshot().lastDecision.recommendedDelayMs).toBe(2000);
  expect(policy.getSnapshot().lastDecision.selectedDelayMs).toBe(5000);
});

test("adaptive mode selects a learned delay only when utility exceeds baseline", () => {
  const model = new RetryOutcomeModel();
  for (let index = 0; index < 8; index += 1) model.observe(2000, true, 350);
  for (let index = 0; index < 8; index += 1) model.observe(5000, false);
  const policy = new AdaptiveRetryPolicy({ mode: "adaptive", model, now: () => 1000 });
  expect(policy.nextRetryDelay({ previousRetryCount: 2, elapsedMilliseconds: 1000 })).toBe(2000);
  expect(policy.getSnapshot().lastDecision.action).toBe("adaptive");
});

test("cold start and retry/time limits fall back or stop deterministically", () => {
  const coldStart = new AdaptiveRetryPolicy({ mode: "adaptive", now: () => 1000 });
  expect(coldStart.nextRetryDelay({ previousRetryCount: 0, elapsedMilliseconds: 0 })).toBe(0);
  expect(coldStart.getSnapshot().lastDecision.action).toBe("baseline");
  expect(coldStart.nextRetryDelay({ previousRetryCount: 4, elapsedMilliseconds: 1000 })).toBeNull();
  const expired = new AdaptiveRetryPolicy({ mode: "adaptive", now: () => 1000 });
  expect(expired.nextRetryDelay({ previousRetryCount: 0, elapsedMilliseconds: 30000 })).toBeNull();
});

test("failed retry and successful recovery outcomes feed the next model", () => {
  let now = 10000;
  const policy = new AdaptiveRetryPolicy({ mode: "passive", now: () => now });
  policy.nextRetryDelay({ previousRetryCount: 0, elapsedMilliseconds: 0 });
  policy.nextRetryDelay({ previousRetryCount: 1, elapsedMilliseconds: 1000 });
  expect(policy.getSnapshot().model[0].failures).toBe(1);
  now += 1000;
  policy.recordSuccess();
  expect(policy.getSnapshot().model[1].successes).toBe(1);
  expect(policy.getSnapshot().measurements.recoveryCount).toBe(1);
});

test("non-retryable HTTP errors stop without training a delay failure", () => {
  expect(isRetryableFailure({ statusCode: 401, message: "Unauthorized" })).toBe(false);
  expect(isRetryableFailure({ data: { status: 403 } })).toBe(false);
  expect(isRetryableFailure({ statusCode: 503, message: "Service unavailable" })).toBe(true);
  expect(isRetryableFailure({ description: { status: 404 }, message: "Transport failed" })).toBe(false);
  expect(isRetryableFailure({ status: 0, description: { status: 404 } })).toBe(false);
  expect(isRetryableFailure({ response: { status: 503 } })).toBe(true);
  expect(isRetryableFailure(new Error("Failed negotiation: Status code '404'"))).toBe(false);
  expect(isRetryableFailure(new Error("ECONNRESET"))).toBe(true);

  let now = 1000;
  const policy = new AdaptiveRetryPolicy({ mode: "adaptive", now: () => now });
  policy.nextRetryDelay({ previousRetryCount: 0, elapsedMilliseconds: 0 });
  now = 1500;
  policy.recordNonRetryableFailure({ statusCode: 401 });
  expect(policy.getSnapshot().model.length).toBe(0);
  expect(policy.getSnapshot().lastDecision.action).toBe("stop");
  expect(policy.getSnapshot().lastDecision.retryIndex).toBe(1);
  expect(policy.getSnapshot().lastDecision.elapsedMilliseconds).toBe(500);
});

test("learned policy cannot remove the minimum wait from later retries", () => {
  const model = new RetryOutcomeModel();
  for (let index = 0; index < 8; index += 1) model.observe(0, true);
  for (let index = 0; index < 8; index += 1) model.observe(2000, false);
  const policy = new AdaptiveRetryPolicy({ mode: "adaptive", model, now: () => 1000 });
  expect(policy.nextRetryDelay({ previousRetryCount: 1, elapsedMilliseconds: 1000 })).toBe(2000);
  expect(policy.getSnapshot().lastDecision.action).toBe("baseline");
});

test("server-forced and client-requested disconnects do not schedule automatic reconnects", () => {
  expect(isRetryableDisconnectReason("io server disconnect")).toBe(false);
  expect(isRetryableDisconnectReason("io client disconnect")).toBe(false);
  expect(isRetryableDisconnectReason("ping timeout")).toBe(true);
  expect(isRetryableDisconnectReason("transport close")).toBe(true);
  expect(isRetryableDisconnectReason("transport error")).toBe(true);
});

test("a server-forced disconnect is recorded as terminal without contaminating delay outcomes", () => {
  let now = 1200;
  const policy = new AdaptiveRetryPolicy({ mode: "adaptive", now: () => now });
  policy.nextRetryDelay({ previousRetryCount: 0, elapsedMilliseconds: 0 });
  now = 1800;
  policy.recordNonRetryableFailure("The Socket.IO server intentionally disconnected this client; automatic retries are disabled.");
  const snapshot = policy.getSnapshot();
  expect(snapshot.model).toHaveLength(0);
  expect(snapshot.measurements.terminalCount).toBe(1);
  expect(snapshot.lastDecision.action).toBe("stop");
  expect(snapshot.lastDecision.elapsedMilliseconds).toBe(600);
  expect(snapshot.lastDecision.reason).toContain("intentionally disconnected");
});
