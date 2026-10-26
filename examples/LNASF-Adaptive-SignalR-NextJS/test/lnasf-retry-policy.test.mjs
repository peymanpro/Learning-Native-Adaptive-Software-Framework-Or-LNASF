import test from "node:test";
import assert from "node:assert/strict";
import { AdaptiveRetryPolicy, RetryOutcomeModel, isRetryableFailure } from "../lib/chat/lnasf-retry-policy.ts";

test("model learns outcomes and predicts success with explicit confidence and utility", () => {
  const model = new RetryOutcomeModel();
  model.observe(0, true, 400);
  model.observe(0, true, 350);
  model.observe(0, false);
  const estimate = model.estimate(0);
  assert.equal(estimate.attempts, 3);
  assert.equal(estimate.successProbability, 3 / 5);
  assert.equal(estimate.confidence, 3 / 5);
  assert.equal(estimate.utility, 3 / 5);
  assert.equal(model.predictBest().delayMs, 0);
});

test("passive mode records recommendations but never changes the deterministic schedule", () => {
  const model = new RetryOutcomeModel();
  for (let i = 0; i < 8; i += 1) model.observe(2000, true);
  for (let i = 0; i < 8; i += 1) model.observe(5000, false);
  const policy = new AdaptiveRetryPolicy({ mode: "passive", model, now: () => 1_000 });
  assert.equal(policy.nextRetryDelay({ previousRetryCount: 2, elapsedMilliseconds: 1_000 }), 5_000);
  assert.equal(policy.getSnapshot().lastDecision.action, "baseline");
  assert.equal(policy.getSnapshot().lastDecision.recommendedDelayMs, 2_000);
});

test("advisory mode explains an alternative but returns the baseline delay", () => {
  const model = new RetryOutcomeModel();
  for (let i = 0; i < 8; i += 1) model.observe(2000, true);
  for (let i = 0; i < 8; i += 1) model.observe(5000, false);
  const policy = new AdaptiveRetryPolicy({ mode: "advisory", model, now: () => 1_000 });
  assert.equal(policy.nextRetryDelay({ previousRetryCount: 2, elapsedMilliseconds: 1_000 }), 5_000);
  assert.equal(policy.getSnapshot().lastDecision.recommendedDelayMs, 2_000);
  assert.equal(policy.getSnapshot().lastDecision.selectedDelayMs, 5_000);
});

test("adaptive mode uses learned evidence only when it beats the baseline utility", () => {
  const model = new RetryOutcomeModel();
  for (let i = 0; i < 8; i += 1) model.observe(2000, true, 350);
  for (let i = 0; i < 8; i += 1) model.observe(5000, false);
  const policy = new AdaptiveRetryPolicy({ mode: "adaptive", model, now: () => 1_000 });
  assert.equal(policy.nextRetryDelay({ previousRetryCount: 2, elapsedMilliseconds: 1_000 }), 2_000);
  assert.equal(policy.getSnapshot().lastDecision.action, "adaptive");
});

test("cold start and insufficient evidence use deterministic baseline", () => {
  const policy = new AdaptiveRetryPolicy({ mode: "adaptive", now: () => 1_000 });
  assert.equal(policy.nextRetryDelay({ previousRetryCount: 0, elapsedMilliseconds: 0 }), 0);
  assert.equal(policy.getSnapshot().lastDecision.action, "baseline");
});

test("retry limits bound attempts and elapsed time", () => {
  const byAttempts = new AdaptiveRetryPolicy({ mode: "adaptive", now: () => 1_000 });
  assert.equal(byAttempts.nextRetryDelay({ previousRetryCount: 4, elapsedMilliseconds: 0 }), null);
  const byTime = new AdaptiveRetryPolicy({ mode: "adaptive", now: () => 1_000 });
  assert.equal(byTime.nextRetryDelay({ previousRetryCount: 0, elapsedMilliseconds: 30_000 }), null);
});

test("a following failed attempt updates the model and success feeds recovery outcomes back", () => {
  let now = 10_000;
  const policy = new AdaptiveRetryPolicy({ mode: "passive", now: () => now });
  policy.nextRetryDelay({ previousRetryCount: 0, elapsedMilliseconds: 0 });
  policy.nextRetryDelay({ previousRetryCount: 2, elapsedMilliseconds: 1_000 });
  assert.equal(policy.getSnapshot().model[0].failures, 1);
  now += 1_000;
  policy.recordSuccess();
  assert.equal(policy.getSnapshot().model[1].successes, 1);
  assert.equal(policy.getSnapshot().measurements.recoveryCount, 1);
});

test("non-retryable HTTP errors stop retries without contaminating the outcome model", () => {
  assert.equal(isRetryableFailure({ statusCode: 401, message: "Unauthorized" }), false);
  assert.equal(isRetryableFailure({ data: { statusCode: 403 } }), false);
  assert.equal(isRetryableFailure({ statusCode: 503, message: "Service unavailable" }), true);
  assert.equal(isRetryableFailure({ description: { status: 404 }, message: "Transport failed" }), false);
  assert.equal(isRetryableFailure({ status: 0, description: { status: 404 } }), false);
  assert.equal(isRetryableFailure({ response: { status: 503 } }), true);
  assert.equal(isRetryableFailure(new Error("Failed negotiation: Status code '404'")), false);
  assert.equal(isRetryableFailure(new Error("ECONNRESET")), true);

  const policy = new AdaptiveRetryPolicy({ mode: "adaptive", now: () => 1000 });
  assert.equal(policy.nextRetryDelay({
    previousRetryCount: 1,
    elapsedMilliseconds: 500,
    retryReason: { statusCode: 401, message: "Unauthorized" },
  }), null);
  assert.equal(policy.getSnapshot().model.length, 0);
  assert.equal(policy.getSnapshot().lastDecision.action, "stop");
});

test("later retries cannot adapt down to a zero-delay loop", () => {
  const model = new RetryOutcomeModel();
  for (let index = 0; index < 8; index += 1) model.observe(0, true);
  for (let index = 0; index < 8; index += 1) model.observe(2000, false);
  const policy = new AdaptiveRetryPolicy({ mode: "adaptive", model, now: () => 1000 });
  assert.equal(policy.nextRetryDelay({ previousRetryCount: 1, elapsedMilliseconds: 1000 }), 2000);
  assert.equal(policy.getSnapshot().lastDecision.action, "baseline");
});
