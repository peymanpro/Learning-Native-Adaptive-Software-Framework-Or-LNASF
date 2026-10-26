const test = require("node:test");
const assert = require("node:assert/strict");
const { TypingAdaptationService, TypingBurstModel, decideTypingStart } = require("../lnasf/typing-adaptation");

test("the native model updates from observed inter-event gaps and produces an explainable prediction", () => {
  const model = new TypingBurstModel();
  assert.equal(model.predict(), null);
  model.observeGap(100);
  model.observeGap(200);
  model.observeGap(900);
  const prediction = model.predict();
  assert.equal(prediction.samples, 3);
  assert.equal(prediction.fastGapProbability, 3 / 5);
  assert.equal(prediction.confidence, 0.5);
  assert.equal(prediction.meanGapMs, 400);
});

test("passive mode learns but always preserves legacy typing-start broadcasts", () => {
  const service = new TypingAdaptationService({ mode: "passive" });
  for (let index = 0; index < 12; index += 1) {
    assert.equal(service.handleStart("socket-a", index * 100).broadcast, true);
  }
  const snapshot = service.getSnapshot();
  assert.equal(snapshot.mode, "passive");
  assert.equal(snapshot.learning.gapSamples, 11);
  assert.equal(snapshot.measurement.typingStartSuppressed, 0);
});

test("advisory mode exposes a learned recommendation without applying it", () => {
  const service = new TypingAdaptationService({ mode: "advisory" });
  for (let index = 0; index < 7; index += 1) service.handleStart("socket-a", index * 100);
  const decision = service.handleStart("socket-a", 700);
  assert.equal(decision.recommendation, "suppress-duplicate");
  assert.equal(decision.action, "broadcast");
  assert.equal(decision.broadcast, true);
});

test("adaptive mode uses deterministic fallback until evidence is sufficient, then suppresses redundant bursts", () => {
  const service = new TypingAdaptationService({ mode: "adaptive" });
  for (let index = 0; index < 6; index += 1) {
    const decision = service.handleStart("socket-a", index * 100);
    assert.equal(decision.broadcast, true);
    assert.equal(decision.action, "broadcast");
  }
  const learnedDecision = service.handleStart("socket-a", 600);
  assert.equal(learnedDecision.prediction.samples, 5);
  assert.equal(learnedDecision.action, "suppress");
  assert.equal(learnedDecision.broadcast, false);
  assert.equal(service.getSnapshot().measurement.typingStartSuppressed, 1);
});

test("low burst evidence does not suppress starts and typing-stop is never suppressed", () => {
  const service = new TypingAdaptationService({ mode: "adaptive" });
  for (let index = 0; index < 7; index += 1) service.handleStart("socket-b", index * 1000);
  const decision = service.handleStart("socket-b", 8000);
  assert.equal(decision.broadcast, true);
  assert.equal(service.handleStop("socket-b").broadcast, true);
});

test("the policy cannot suppress a first start or act when its mode is not adaptive", () => {
  const prediction = { samples: 20, fastGapProbability: 0.9, confidence: 0.87 };
  const passive = decideTypingStart({ mode: "passive", prediction, isTyping: true, sinceLastBroadcastMs: 20 });
  const coldStart = decideTypingStart({ mode: "adaptive", prediction: null, isTyping: false, sinceLastBroadcastMs: null });
  assert.equal(passive.action, "broadcast");
  assert.equal(passive.recommendation, "suppress-duplicate");
  assert.equal(coldStart.action, "broadcast");
});

test("adaptive and passive modes can be compared on the same deterministic typing burst", () => {
  const passive = new TypingAdaptationService({ mode: "passive" });
  const adaptive = new TypingAdaptationService({ mode: "adaptive" });
  const events = Array.from({ length: 30 }, (_, index) => index * 100);
  const passiveBroadcasts = events.filter((time) => passive.handleStart("same-trace", time).broadcast).length;
  const adaptiveBroadcasts = events.filter((time) => adaptive.handleStart("same-trace", time).broadcast).length;
  assert.equal(passiveBroadcasts, events.length);
  assert.ok(adaptiveBroadcasts < passiveBroadcasts);
  assert.ok(adaptive.getSnapshot().measurement.typingStartSuppressed > 0);
});
