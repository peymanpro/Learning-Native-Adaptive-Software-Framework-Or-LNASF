const VALID_MODES = new Set(["passive", "advisory", "adaptive"]);

function normalizeMode(value) {
  return VALID_MODES.has(value) ? value : "passive";
}

class TypingBurstModel {
  constructor() {
    this.samples = 0;
    this.fastGaps = 0;
    this.totalGapMs = 0;
  }

  observeGap(gapMs) {
    if (!Number.isFinite(gapMs) || gapMs < 0) return;
    this.samples += 1;
    this.totalGapMs += gapMs;
    if (gapMs <= 500) this.fastGaps += 1;
  }

  predict() {
    if (this.samples === 0) return null;
    return {
      samples: this.samples,
      fastGapProbability: (this.fastGaps + 1) / (this.samples + 2),
      confidence: this.samples / (this.samples + 3),
      meanGapMs: this.totalGapMs / this.samples,
    };
  }
}

function decideTypingStart({ mode, prediction, isTyping, sinceLastBroadcastMs }) {
  const cooldownMs = prediction
    ? prediction.fastGapProbability >= 0.75 ? 500
      : prediction.fastGapProbability >= 0.55 ? 300 : 150
    : 150;
  const enoughEvidence = Boolean(prediction && prediction.samples >= 5 && prediction.confidence >= 0.6);
  const recommendedSuppress = Boolean(
    enoughEvidence && isTyping && Number.isFinite(sinceLastBroadcastMs) && sinceLastBroadcastMs >= 0 &&
    sinceLastBroadcastMs < cooldownMs
  );

  if (mode === "passive") {
    return { action: "broadcast", recommendation: recommendedSuppress ? "suppress-duplicate" : "broadcast", cooldownMs, reason: "Passive mode learns from events but never changes delivery." };
  }
  if (mode === "advisory") {
    return { action: "broadcast", recommendation: recommendedSuppress ? "suppress-duplicate" : "broadcast", cooldownMs, reason: "Advisory mode reports the policy recommendation without applying it." };
  }
  if (!enoughEvidence) {
    return { action: "broadcast", recommendation: "broadcast", cooldownMs, reason: "Insufficient evidence; deterministic broadcast fallback is active." };
  }
  if (recommendedSuppress) {
    return { action: "suppress", recommendation: "suppress-duplicate", cooldownMs, reason: "Observed typing bursts and sufficient evidence permit suppressing a duplicate start event." };
  }
  return { action: "broadcast", recommendation: "broadcast", cooldownMs, reason: "The event is outside the learned duplicate window or is not a duplicate." };
}

class TypingAdaptationService {
  constructor({ mode = process.env.LNASF_MODE ?? "passive" } = {}) {
    this.mode = normalizeMode(mode);
    this.model = new TypingBurstModel();
    this.sessions = new Map();
    this.counters = { typingStartReceived: 0, typingStartBroadcast: 0, typingStartSuppressed: 0, typingStopBroadcast: 0 };
    this.lastDecision = null;
  }

  handleStart(socketId, nowMs = Date.now()) {
    const session = this.sessions.get(socketId) ?? { isTyping: false, lastStartAt: null, lastBroadcastAt: null };
    const gapMs = session.lastStartAt === null ? null : Math.max(0, nowMs - session.lastStartAt);
    const prediction = this.model.predict();
    const decision = decideTypingStart({
      mode: this.mode,
      prediction,
      isTyping: session.isTyping,
      sinceLastBroadcastMs: session.lastBroadcastAt === null ? null : Math.max(0, nowMs - session.lastBroadcastAt),
    });

    this.model.observeGap(gapMs);
    session.lastStartAt = nowMs;
    this.counters.typingStartReceived += 1;
    const broadcast = decision.action !== "suppress";
    if (broadcast) {
      session.isTyping = true;
      session.lastBroadcastAt = nowMs;
      this.counters.typingStartBroadcast += 1;
    } else {
      this.counters.typingStartSuppressed += 1;
    }
    this.sessions.set(socketId, session);
    this.lastDecision = { ...decision, broadcast, prediction, gapMs };
    return this.lastDecision;
  }

  handleStop(socketId) {
    const session = this.sessions.get(socketId);
    if (session) {
      session.isTyping = false;
      session.lastStartAt = null;
      session.lastBroadcastAt = null;
      this.sessions.set(socketId, session);
    }
    this.counters.typingStopBroadcast += 1;
    this.lastDecision = { action: "broadcast", recommendation: "broadcast", cooldownMs: 0, broadcast: true, reason: "Typing-stop events always pass through to preserve typing state." };
    return this.lastDecision;
  }

  remove(socketId) {
    this.sessions.delete(socketId);
  }

  getSnapshot() {
    const prediction = this.model.predict();
    const starts = this.counters.typingStartReceived;
    return {
      framework: "LNASF",
      mode: this.mode,
      learning: { gapSamples: this.model.samples, fastGaps: this.model.fastGaps, meanGapMs: prediction?.meanGapMs ?? null },
      prediction: prediction ? { fastGapProbability: prediction.fastGapProbability, confidence: prediction.confidence } : null,
      measurement: {
        ...this.counters,
        duplicateSuppressionRate: starts ? this.counters.typingStartSuppressed / starts : 0,
        activeSessions: this.sessions.size,
      },
      lastDecision: this.lastDecision,
    };
  }
}

module.exports = { TypingAdaptationService, TypingBurstModel, decideTypingStart, normalizeMode };
