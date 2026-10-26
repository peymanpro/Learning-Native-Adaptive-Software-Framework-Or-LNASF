export type LnasfMode = "passive" | "advisory" | "adaptive";

export interface RetryContext {
  previousRetryCount?: number;
  elapsedMilliseconds?: number;
  retryReason?: unknown;
}

export interface DelayOutcome {
  delayMs: number;
  attempts: number;
  successes: number;
  failures: number;
  successProbability: number;
  confidence: number;
  utility: number;
}

export interface RetryDecision {
  mode: LnasfMode;
  action: "baseline" | "adaptive" | "stop";
  baselineDelayMs: number | null;
  recommendedDelayMs: number | null;
  selectedDelayMs: number | null;
  reason: string;
  elapsedMilliseconds: number;
  retryIndex: number;
}

const BASELINE_DELAYS_MS = [0, 2_000, 5_000, 10_000] as const;
const MAX_RETRY_ATTEMPTS = 4;
const MAX_ELAPSED_MS = 30_000;
const MIN_DELAY_SAMPLES = 3;
const MIN_CONFIDENCE = 0.6;
const MIN_SUCCESS_PROBABILITY = 0.55;
const MIN_UTILITY_GAIN = 0.05;
const MAX_DELAY_MS = 10_000;
const DELAY_COST_WEIGHT = 0.15;

export function normalizeLnasfMode(value: string | undefined): LnasfMode {
  return value === "advisory" || value === "adaptive" || value === "passive" ? value : "passive";
}

const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 403, 404, 405, 426]);

export function isRetryableFailure(reason: unknown): boolean {
  if (!reason || typeof reason !== "object") return true;
  type FailureDetails = {
    statusCode?: unknown;
    status?: unknown;
    message?: unknown;
    statusText?: unknown;
    retryable?: unknown;
  };
  const value = reason as FailureDetails & { data?: unknown; description?: unknown; response?: unknown };
  const asDetails = (candidate: unknown): FailureDetails | undefined =>
    candidate && typeof candidate === "object" ? candidate as FailureDetails : undefined;
  const data = asDetails(value.data);
  const description = asDetails(value.description);
  const response = asDetails(value.response);

  if (value.retryable === false || data?.retryable === false || description?.retryable === false) return false;

  // Transport libraries expose HTTP status in different places (directly, in data,
  // or on a nested response/description object). Inspect these known shapes before
  // classifying by message; do not train a retry-delay model on permanent failures.
  const hasNonRetryableStatus = [
    value.statusCode, value.status,
    data?.statusCode, data?.status,
    description?.statusCode, description?.status,
    response?.statusCode, response?.status,
  ].some((candidate) => typeof candidate === "number" && NON_RETRYABLE_STATUS_CODES.has(candidate));
  if (hasNonRetryableStatus) return false;

  const message = [value.message, data?.message, description?.message, response?.statusText]
    .filter((candidate): candidate is string => typeof candidate === "string")
    .join(" ");
  if (/\b(?:status(?:\s+code)?)\s*[:'"]?\s*(400|401|403|404|405|426)\b/i.test(message)) return false;
  return !/unauthorized|unauthorised|forbidden|not authorized|not found|bad request|method not allowed|upgrade required|invalid hub url/i.test(message);
}

export class RetryOutcomeModel {
  private readonly outcomes = new Map<number, { attempts: number; successes: number; failures: number; totalRecoveryMs: number }>();

  observe(delayMs: number, succeeded: boolean, recoveryMilliseconds = 0): void {
    if (!Number.isFinite(delayMs) || delayMs < 0) return;
    const current = this.outcomes.get(delayMs) ?? { attempts: 0, successes: 0, failures: 0, totalRecoveryMs: 0 };
    current.attempts += 1;
    if (succeeded) current.successes += 1;
    else current.failures += 1;
    if (Number.isFinite(recoveryMilliseconds) && recoveryMilliseconds >= 0) current.totalRecoveryMs += recoveryMilliseconds;
    this.outcomes.set(delayMs, current);
  }

  predictBest(): DelayOutcome | null {
    const candidates = [...this.outcomes.entries()]
      .filter(([, value]) => value.attempts >= MIN_DELAY_SAMPLES)
      .map(([delayMs, value]) => {
        const successProbability = (value.successes + 1) / (value.attempts + 2);
        const confidence = value.attempts / (value.attempts + 2);
        const utility = successProbability - (delayMs / MAX_DELAY_MS) * DELAY_COST_WEIGHT;
        return { delayMs, attempts: value.attempts, successes: value.successes, failures: value.failures, successProbability, confidence, utility };
      })
      .filter((candidate) => candidate.confidence >= MIN_CONFIDENCE && candidate.successProbability >= MIN_SUCCESS_PROBABILITY)
      .sort((left, right) => right.utility - left.utility || left.delayMs - right.delayMs);

    return candidates[0] ?? null;
  }

  estimate(delayMs: number): DelayOutcome | null {
    const value = this.outcomes.get(delayMs);
    if (!value) return null;
    const successProbability = (value.successes + 1) / (value.attempts + 2);
    const confidence = value.attempts / (value.attempts + 2);
    const utility = successProbability - (delayMs / MAX_DELAY_MS) * DELAY_COST_WEIGHT;
    return { delayMs, ...value, successProbability, confidence, utility };
  }

  getSnapshot() {
    return [...this.outcomes.entries()].sort(([a], [b]) => a - b).map(([delayMs, value]) => ({
      delayMs,
      attempts: value.attempts,
      successes: value.successes,
      failures: value.failures,
      averageRecoveryMs: value.successes ? value.totalRecoveryMs / value.successes : null,
      successProbability: (value.successes + 1) / (value.attempts + 2),
      confidence: value.attempts / (value.attempts + 2),
    }));
  }
}

/** Learns which permitted retry delays have worked, while keeping prediction separate from action. */
export class AdaptiveRetryPolicy {
  readonly mode: LnasfMode;
  readonly model: RetryOutcomeModel;
  private readonly now: () => number;
  private readonly onMetricsChange?: (snapshot: ReturnType<AdaptiveRetryPolicy["getSnapshot"]>) => void;
  private pendingDelayMs: number | null = null;
  private episodeStartedAt: number | null = null;
  private retryCount = 0;
  private recoveryCount = 0;
  private terminalCount = 0;
  private lastDecision: RetryDecision | null = null;

  constructor(options: {
    mode?: LnasfMode;
    model?: RetryOutcomeModel;
    now?: () => number;
    onMetricsChange?: (snapshot: ReturnType<AdaptiveRetryPolicy["getSnapshot"]>) => void;
  } = {}) {
    this.mode = options.mode ?? "passive";
    this.model = options.model ?? new RetryOutcomeModel();
    this.now = options.now ?? (() => Date.now());
    this.onMetricsChange = options.onMetricsChange;
  }

  nextRetryDelay(context: RetryContext = {}): number | null {
    const retryIndex = Number.isInteger(context.previousRetryCount) && context.previousRetryCount! >= 0
      ? context.previousRetryCount!
      : this.retryCount;
    if (!isRetryableFailure(context.retryReason)) {
      this.pendingDelayMs = null;
      this.retryCount = 0;
      this.episodeStartedAt = null;
      this.lastDecision = {
        mode: this.mode, action: "stop", baselineDelayMs: null, recommendedDelayMs: null,
        selectedDelayMs: null,
        reason: "The SignalR failure is classified as non-retryable; no delay outcome was learned.",
        elapsedMilliseconds: Math.max(0, context.elapsedMilliseconds ?? 0), retryIndex,
      };
      this.notify();
      return null;
    }

    this.settlePendingFailure();
    const now = this.now();
    if (this.episodeStartedAt === null) this.episodeStartedAt = now;
    const elapsedMilliseconds = Number.isFinite(context.elapsedMilliseconds)
      ? Math.max(0, context.elapsedMilliseconds!)
      : Math.max(0, now - this.episodeStartedAt);
    const baselineDelayMs = BASELINE_DELAYS_MS[retryIndex as 0 | 1 | 2 | 3] ?? null;

    if (baselineDelayMs === null || retryIndex >= MAX_RETRY_ATTEMPTS || elapsedMilliseconds >= MAX_ELAPSED_MS) {
      this.pendingDelayMs = null;
      this.retryCount = retryIndex;
      this.lastDecision = {
        mode: this.mode, action: "stop", baselineDelayMs: null, recommendedDelayMs: null,
        selectedDelayMs: null, reason: "The deterministic retry-attempt or elapsed-time limit has been reached.",
        elapsedMilliseconds, retryIndex,
      };
      this.notify();
      return null;
    }

    const prediction = this.model.predictBest();
    const observedBaseline = this.model.estimate(baselineDelayMs);
    const baselineUtility = observedBaseline && observedBaseline.attempts >= MIN_DELAY_SAMPLES
      ? observedBaseline.utility
      : 0.5 - (baselineDelayMs / MAX_DELAY_MS) * DELAY_COST_WEIGHT;
    const minimumAllowedDelayMs = retryIndex === 0 ? 0 : 1_000;
    const isMateriallyBetter = Boolean(
      prediction &&
      prediction.delayMs >= minimumAllowedDelayMs &&
      prediction.delayMs !== baselineDelayMs &&
      prediction.utility >= baselineUtility + MIN_UTILITY_GAIN
    );
    const recommendedDelayMs = isMateriallyBetter ? prediction!.delayMs : baselineDelayMs;
    const adaptiveSelected = this.mode === "adaptive" && isMateriallyBetter;
    const selectedDelayMs = adaptiveSelected ? recommendedDelayMs : baselineDelayMs;

    this.pendingDelayMs = selectedDelayMs;
    this.retryCount = retryIndex + 1;
    this.lastDecision = {
      mode: this.mode,
      action: adaptiveSelected ? "adaptive" : "baseline",
      baselineDelayMs,
      recommendedDelayMs,
      selectedDelayMs,
      reason: adaptiveSelected
        ? `Observed outcomes support ${recommendedDelayMs} ms: predicted success ${prediction!.successProbability.toFixed(2)}, confidence ${prediction!.confidence.toFixed(2)}, utility gain ${(prediction!.utility - baselineUtility).toFixed(2)}.`
        : this.mode === "advisory" && isMateriallyBetter
          ? `Advisory recommendation: ${recommendedDelayMs} ms; actual delay remains the deterministic baseline.`
          : prediction
            ? "No sufficiently better learned delay is supported; deterministic baseline retained."
            : "Insufficient historical outcomes; deterministic baseline retained.",
      elapsedMilliseconds,
      retryIndex,
    };
    this.notify();
    return selectedDelayMs;
  }

  recordSuccess(): void {
    if (this.pendingDelayMs !== null) {
      const delay = this.pendingDelayMs;
      const recoveryMs = this.episodeStartedAt === null ? 0 : Math.max(0, this.now() - this.episodeStartedAt);
      this.model.observe(delay, true, recoveryMs);
      this.pendingDelayMs = null;
      this.recoveryCount += 1;
    }
    this.retryCount = 0;
    this.episodeStartedAt = null;
    this.notify();
  }

  recordTerminalFailure(): void {
    this.settlePendingFailure();
    this.terminalCount += 1;
    this.retryCount = 0;
    this.episodeStartedAt = null;
    this.notify();
  }

  recordAbandoned(): void {
    // An intentional leave/unmount is not evidence that a retry delay failed.
    this.pendingDelayMs = null;
    this.retryCount = 0;
    this.episodeStartedAt = null;
    this.notify();
  }

  private settlePendingFailure(): void {
    if (this.pendingDelayMs === null) return;
    this.model.observe(this.pendingDelayMs, false);
    this.pendingDelayMs = null;
  }

  private notify(): void {
    this.onMetricsChange?.(this.getSnapshot());
  }

  getSnapshot() {
    return {
      framework: "LNASF",
      mode: this.mode,
      retryBudget: { maxAttempts: MAX_RETRY_ATTEMPTS, maxElapsedMs: MAX_ELAPSED_MS },
      model: this.model.getSnapshot(),
      measurements: { recoveryCount: this.recoveryCount, terminalCount: this.terminalCount },
      lastDecision: this.lastDecision,
    };
  }
}
