const BASELINE_DELAYS_MS = [0, 2000, 5000, 10000];
const MAX_RETRY_ATTEMPTS = 4;
const MAX_ELAPSED_MS = 30000;
const MIN_DELAY_SAMPLES = 3;
const MIN_CONFIDENCE = 0.6;
const MIN_SUCCESS_PROBABILITY = 0.55;
const MIN_UTILITY_GAIN = 0.05;
const MAX_DELAY_MS = 10000;
const DELAY_COST_WEIGHT = 0.15;

export function normalizeLnasfMode(value) {
  return value === "advisory" || value === "adaptive" || value === "passive" ? value : "passive";
}

const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 403, 404, 405, 426]);
const NON_RETRYABLE_DISCONNECT_REASONS = new Set(["io client disconnect", "io server disconnect"]);

export function isRetryableDisconnectReason(reason) {
  return !NON_RETRYABLE_DISCONNECT_REASONS.has(reason);
}

export function isRetryableFailure(reason) {
  if (!reason || typeof reason !== "object") return true;
  const asDetails = (candidate) => candidate && typeof candidate === "object" ? candidate : null;
  const data = asDetails(reason.data);
  const description = asDetails(reason.description);
  const response = asDetails(reason.response);
  if (reason.retryable === false || data?.retryable === false || description?.retryable === false) return false;

  // Socket.IO transport errors can expose HTTP status on a nested xhr/response
  // object. Treat known permanent responses as terminal rather than retrying them.
  const statuses = [
    reason.statusCode, reason.status,
    data?.statusCode, data?.status,
    description?.statusCode, description?.status,
    response?.statusCode, response?.status,
  ];
  const hasNonRetryableStatus = statuses.some((value) => typeof value === "number" && NON_RETRYABLE_STATUS_CODES.has(value));
  if (hasNonRetryableStatus) return false;

  const message = [reason.message, data?.message, description?.message, response?.statusText]
    .filter((value) => typeof value === "string")
    .join(" ");
  if (/\b(?:status(?:\s+code)?)\s*[:'"]?\s*(400|401|403|404|405|426)\b/i.test(message)) return false;
  return !/unauthorized|unauthorised|forbidden|not authorized|not found|bad request|method not allowed|upgrade required|invalid namespace|namespace not found/i.test(message);
}

export class RetryOutcomeModel {
  constructor() {
    this.outcomes = new Map();
  }

  observe(delayMs, succeeded, recoveryMilliseconds = 0) {
    if (!Number.isFinite(delayMs) || delayMs < 0) return;
    const current = this.outcomes.get(delayMs) ?? {
      attempts: 0, successes: 0, failures: 0, totalRecoveryMs: 0,
    };
    current.attempts += 1;
    if (succeeded) current.successes += 1;
    else current.failures += 1;
    if (Number.isFinite(recoveryMilliseconds) && recoveryMilliseconds >= 0) current.totalRecoveryMs += recoveryMilliseconds;
    this.outcomes.set(delayMs, current);
  }

  predictBest() {
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

  estimate(delayMs) {
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

export class AdaptiveRetryPolicy {
  constructor({ mode = "passive", model, now, onMetricsChange } = {}) {
    this.mode = normalizeLnasfMode(mode);
    this.model = model ?? new RetryOutcomeModel();
    this.now = now ?? (() => Date.now());
    this.onMetricsChange = onMetricsChange;
    this.pendingDelayMs = null;
    this.episodeStartedAt = null;
    this.retryCount = 0;
    this.recoveryCount = 0;
    this.terminalCount = 0;
    this.lastDecision = null;
  }

  nextRetryDelay(context = {}) {
    this.settlePendingFailure();
    const retryIndex = Number.isInteger(context.previousRetryCount) && context.previousRetryCount >= 0
      ? context.previousRetryCount
      : this.retryCount;
    const now = this.now();
    if (this.episodeStartedAt === null) this.episodeStartedAt = now;
    const elapsedMilliseconds = Number.isFinite(context.elapsedMilliseconds)
      ? Math.max(0, context.elapsedMilliseconds)
      : Math.max(0, now - this.episodeStartedAt);
    const baselineDelayMs = BASELINE_DELAYS_MS[retryIndex] ?? null;

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
    const minimumAllowedDelayMs = retryIndex === 0 ? 0 : 1000;
    const observedBaseline = this.model.estimate(baselineDelayMs);
    const baselineUtility = observedBaseline && observedBaseline.attempts >= MIN_DELAY_SAMPLES
      ? observedBaseline.utility
      : 0.5 - (baselineDelayMs / MAX_DELAY_MS) * DELAY_COST_WEIGHT;
    const isMateriallyBetter = Boolean(
      prediction && prediction.delayMs >= minimumAllowedDelayMs && prediction.delayMs !== baselineDelayMs &&
      prediction.utility >= baselineUtility + MIN_UTILITY_GAIN
    );
    const recommendedDelayMs = isMateriallyBetter ? prediction.delayMs : baselineDelayMs;
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
        ? `Observed outcomes support ${recommendedDelayMs} ms: predicted success ${prediction.successProbability.toFixed(2)}, confidence ${prediction.confidence.toFixed(2)}, utility gain ${(prediction.utility - baselineUtility).toFixed(2)}.`
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

  recordSuccess() {
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

  recordTerminalFailure() {
    this.settlePendingFailure();
    this.terminalCount += 1;
    this.retryCount = 0;
    this.episodeStartedAt = null;
    this.notify();
  }

  recordNonRetryableFailure(reason = "The Socket.IO server rejected the connection with a non-retryable error; no delay outcome was learned.") {
    // Capture episode diagnostics before reset so the stop decision stays explainable.
    const retryIndex = this.retryCount;
    const elapsedMilliseconds = this.episodeStartedAt === null
      ? 0
      : Math.max(0, this.now() - this.episodeStartedAt);
    this.pendingDelayMs = null;
    this.retryCount = 0;
    this.episodeStartedAt = null;
    this.terminalCount += 1;
    this.lastDecision = {
      mode: this.mode,
      action: "stop",
      baselineDelayMs: null,
      recommendedDelayMs: null,
      selectedDelayMs: null,
      reason,
      elapsedMilliseconds,
      retryIndex,
    };
    this.notify();
  }

  recordAbandoned() {
    this.pendingDelayMs = null;
    this.retryCount = 0;
    this.episodeStartedAt = null;
    this.notify();
  }

  resetEpisode() {
    this.pendingDelayMs = null;
    this.retryCount = 0;
    this.episodeStartedAt = null;
    this.lastDecision = null;
    this.notify();
  }

  settlePendingFailure() {
    if (this.pendingDelayMs === null) return;
    this.model.observe(this.pendingDelayMs, false);
    this.pendingDelayMs = null;
  }

  notify() {
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
