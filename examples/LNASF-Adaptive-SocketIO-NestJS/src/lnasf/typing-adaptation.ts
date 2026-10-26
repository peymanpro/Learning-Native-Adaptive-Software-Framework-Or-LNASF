import { Inject, Injectable, Optional } from "@nestjs/common";

export type LearningMode = "passive" | "advisory" | "adaptive";

export interface TypingPrediction {
  samples: number;
  fastGapProbability: number;
  confidence: number;
  meanGapMs: number;
}

export interface TypingDecision {
  action: "broadcast" | "suppress";
  recommendation: "broadcast" | "suppress-duplicate";
  cooldownMs: number;
  reason: string;
  broadcast: boolean;
  prediction: TypingPrediction | null;
  gapMs: number | null;
}

type TypingSession = {
  isTyping: boolean;
  lastStartAt: number | null;
  lastBroadcastAt: number | null;
};

const VALID_MODES = new Set<string>(["passive", "advisory", "adaptive"]);

export function normalizeLearningMode(value: string | undefined): LearningMode {
  return value && VALID_MODES.has(value) ? value as LearningMode : "passive";
}

export class TypingBurstModel {
  private samples = 0;
  private fastGaps = 0;
  private totalGapMs = 0;

  observeGap(gapMs: number | null): void {
    if (gapMs === null || !Number.isFinite(gapMs) || gapMs < 0) return;
    this.samples += 1;
    this.totalGapMs += gapMs;
    if (gapMs <= 500) this.fastGaps += 1;
  }

  predict(): TypingPrediction | null {
    if (this.samples === 0) return null;
    return {
      samples: this.samples,
      fastGapProbability: (this.fastGaps + 1) / (this.samples + 2),
      confidence: this.samples / (this.samples + 3),
      meanGapMs: this.totalGapMs / this.samples,
    };
  }

  get sampleCount(): number {
    return this.samples;
  }

  get fastGapCount(): number {
    return this.fastGaps;
  }
}

export function decideTypingStart(input: {
  mode: LearningMode;
  prediction: TypingPrediction | null;
  isTyping: boolean;
  sinceLastBroadcastMs: number | null;
}): Omit<TypingDecision, "broadcast" | "prediction" | "gapMs"> {
  const { mode, prediction, isTyping, sinceLastBroadcastMs } = input;
  const probability = prediction?.fastGapProbability ?? 0.5;
  const cooldownMs = probability >= 0.75 ? 500 : probability >= 0.55 ? 300 : 150;
  const enoughEvidence = Boolean(prediction && prediction.samples >= 5 && prediction.confidence >= 0.6);
  const recommendedSuppress = Boolean(
    enoughEvidence && isTyping && sinceLastBroadcastMs !== null &&
    Number.isFinite(sinceLastBroadcastMs) && sinceLastBroadcastMs >= 0 && sinceLastBroadcastMs < cooldownMs
  );

  if (mode === "passive") {
    return { action: "broadcast", recommendation: recommendedSuppress ? "suppress-duplicate" : "broadcast", cooldownMs, reason: "Passive mode learns without changing event delivery." };
  }
  if (mode === "advisory") {
    return { action: "broadcast", recommendation: recommendedSuppress ? "suppress-duplicate" : "broadcast", cooldownMs, reason: "Advisory mode reports a recommendation but does not apply it." };
  }
  if (!enoughEvidence) {
    return { action: "broadcast", recommendation: "broadcast", cooldownMs, reason: "Insufficient evidence; deterministic broadcast fallback is active." };
  }
  if (recommendedSuppress) {
    return { action: "suppress", recommendation: "suppress-duplicate", cooldownMs, reason: "A learned burst prediction and the bounded cooldown policy permit suppressing this duplicate start." };
  }
  return { action: "broadcast", recommendation: "broadcast", cooldownMs, reason: "No duplicate suppression is justified for this event." };
}

@Injectable()
export class TypingAdaptationService {
  readonly mode: LearningMode;
  private readonly model = new TypingBurstModel();
  private readonly sessions = new Map<string, TypingSession>();
  private readonly counters = { typingStartReceived: 0, typingStartBroadcast: 0, typingStartSuppressed: 0, typingStopBroadcast: 0 };
  private lastDecision: TypingDecision | null = null;

  constructor(@Optional() @Inject("LNASF_MODE") mode?: string) {
    this.mode = normalizeLearningMode(mode ?? process.env.LNASF_MODE);
  }

  handleStart(socketId: string, nowMs = Date.now()): TypingDecision {
    const session = this.sessions.get(socketId) ?? { isTyping: false, lastStartAt: null, lastBroadcastAt: null };
    const gapMs = session.lastStartAt === null ? null : Math.max(0, nowMs - session.lastStartAt);
    const prediction = this.model.predict();
    const baseDecision = decideTypingStart({
      mode: this.mode,
      prediction,
      isTyping: session.isTyping,
      sinceLastBroadcastMs: session.lastBroadcastAt === null ? null : Math.max(0, nowMs - session.lastBroadcastAt),
    });

    this.model.observeGap(gapMs);
    session.lastStartAt = nowMs;
    this.counters.typingStartReceived += 1;
    const broadcast = baseDecision.action !== "suppress";
    if (broadcast) {
      session.isTyping = true;
      session.lastBroadcastAt = nowMs;
      this.counters.typingStartBroadcast += 1;
    } else {
      this.counters.typingStartSuppressed += 1;
    }
    this.sessions.set(socketId, session);
    this.lastDecision = { ...baseDecision, broadcast, prediction, gapMs };
    return this.lastDecision;
  }

  handleStop(socketId: string): TypingDecision {
    const session = this.sessions.get(socketId);
    if (session) this.sessions.set(socketId, { isTyping: false, lastStartAt: null, lastBroadcastAt: null });
    this.counters.typingStopBroadcast += 1;
    this.lastDecision = {
      action: "broadcast",
      recommendation: "broadcast",
      cooldownMs: 0,
      broadcast: true,
      prediction: this.model.predict(),
      gapMs: null,
      reason: "Typing-stop events always pass through to preserve client typing state.",
    };
    return this.lastDecision;
  }

  remove(socketId: string): void {
    this.sessions.delete(socketId);
  }

  getSnapshot() {
    const prediction = this.model.predict();
    const starts = this.counters.typingStartReceived;
    return {
      framework: "LNASF",
      mode: this.mode,
      learning: { gapSamples: this.model.sampleCount, fastGaps: this.model.fastGapCount, meanGapMs: prediction?.meanGapMs ?? null },
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
