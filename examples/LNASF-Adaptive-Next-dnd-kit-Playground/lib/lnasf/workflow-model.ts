export type WorkflowEvent = "list:reorder" | "task:reorder" | "task:move";

export interface WorkflowObservation {
  event: WorkflowEvent;
  occurredAt: number;
}

export interface WorkflowSnapshot {
  observations: WorkflowObservation[];
  transitionCounts: Record<string, number>;
}

export const MAX_OBSERVATIONS = 100;
const MIN_SUPPORT = 3;
const MIN_CONFIDENCE = 0.65;

export function observeWorkflowEvent(
  snapshot: WorkflowSnapshot,
  event: WorkflowEvent,
  occurredAt = Date.now(),
): WorkflowSnapshot {
  const observations = [...snapshot.observations, { event, occurredAt }].slice(-MAX_OBSERVATIONS);
  const transitionCounts: Record<string, number> = {};

  for (let index = 1; index < observations.length; index += 1) {
    const key = `${observations[index - 1].event} -> ${observations[index].event}`;
    transitionCounts[key] = (transitionCounts[key] ?? 0) + 1;
  }

  return { observations, transitionCounts };
}

export interface WorkflowRecommendation {
  nextEvent: WorkflowEvent;
  confidence: number;
  support: number;
}

export function recommendNextEvent(snapshot: WorkflowSnapshot): WorkflowRecommendation | null {
  const previous = snapshot.observations.at(-1)?.event;
  if (!previous) return null;

  const outgoing = Object.entries(snapshot.transitionCounts)
    .filter(([key]) => key.startsWith(`${previous} -> `))
    .map(([key, count]) => ({
      event: key.slice(key.indexOf(" -> ") + 4) as WorkflowEvent,
      count,
    }));

  const total = outgoing.reduce((sum, candidate) => sum + candidate.count, 0);
  const best = outgoing.sort((a, b) => b.count - a.count || a.event.localeCompare(b.event))[0];
  if (!best || best.count < MIN_SUPPORT || best.count / total < MIN_CONFIDENCE) return null;

  return { nextEvent: best.event, confidence: best.count / total, support: best.count };
}

export const emptyWorkflowSnapshot: WorkflowSnapshot = {
  observations: [],
  transitionCounts: {},
};
