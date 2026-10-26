const test = require("node:test");
const assert = require("node:assert/strict");
const { TypingAdaptationService, TypingBurstModel, decideTypingStart } = require("../dist/lnasf/typing-adaptation.js");

test("the model learns gap frequency and emits an explainable prediction", () => {
  const model = new TypingBurstModel();
  assert.equal(model.predict(), null);
  model.observeGap(100);
  model.observeGap(200);
  model.observeGap(900);
  assert.deepEqual(model.predict(), {
    samples: 3,
    fastGapProbability: 3 / 5,
    confidence: 0.5,
    meanGapMs: 400,
  });
});

test("passive mode learns but never suppresses runtime typing-start events", () => {
  const service = new TypingAdaptationService("passive");
  for (let index = 0; index < 8; index += 1) {
    assert.equal(service.handleStart("socket-passive", index * 100).broadcast, true);
  }
  assert.equal(service.getSnapshot().mode, "passive");
  assert.equal(service.getSnapshot().learning.gapSamples, 7);
  assert.equal(service.getSnapshot().measurement.typingStartSuppressed, 0);
});

test("advisory mode reports a recommendation without authorizing the action", () => {
  const decision = decideTypingStart({
    mode: "advisory",
    prediction: { samples: 8, fastGapProbability: 0.9, confidence: 8 / 11, meanGapMs: 100 },
    isTyping: true,
    sinceLastBroadcastMs: 80,
  });
  assert.equal(decision.action, "broadcast");
  assert.equal(decision.recommendation, "suppress-duplicate");
});

test("adaptive mode falls back during cold start then suppresses a learned duplicate burst", () => {
  const service = new TypingAdaptationService("adaptive");
  const initial = decideTypingStart({ mode: "adaptive", prediction: null, isTyping: true, sinceLastBroadcastMs: 1 });
  assert.equal(initial.action, "broadcast");

  for (let index = 0; index < 6; index += 1) {
    assert.equal(service.handleStart("socket-adaptive", index * 100).broadcast, true);
  }
  const learnedDecision = service.handleStart("socket-adaptive", 600);
  assert.equal(learnedDecision.action, "suppress");
  assert.equal(learnedDecision.broadcast, false);
  assert.equal(service.getSnapshot().measurement.typingStartSuppressed, 1);
});

test("typing-stop always passes through and resets the per-socket observation window", () => {
  const service = new TypingAdaptationService("adaptive");
  service.handleStart("socket-a", 0);
  const stop = service.handleStop("socket-a");
  assert.equal(stop.broadcast, true);
  assert.equal(service.getSnapshot().measurement.typingStopBroadcast, 1);
});

test("adaptive service reduces duplicate broadcasts against passive baseline on the same trace", () => {
  const passive = new TypingAdaptationService("passive");
  const adaptive = new TypingAdaptationService("adaptive");
  const events = Array.from({ length: 30 }, (_, index) => index * 100);
  const passiveBroadcasts = events.filter((time) => passive.handleStart("same-trace", time).broadcast).length;
  const adaptiveBroadcasts = events.filter((time) => adaptive.handleStart("same-trace", time).broadcast).length;
  assert.equal(passiveBroadcasts, events.length);
  assert.ok(adaptiveBroadcasts < passiveBroadcasts);
  assert.ok(adaptive.getSnapshot().measurement.typingStartSuppressed > 0);
});
