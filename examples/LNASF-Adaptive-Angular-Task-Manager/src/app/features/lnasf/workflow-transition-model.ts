export const WORKFLOW_ACTIONS = [
  'task:add',
  'task:complete',
  'task:reopen',
  'task:edit',
  'task:delete',
  'filter:all',
  'filter:active',
  'filter:completed',
] as const;

export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];

export interface WorkflowOutcome {
  action: WorkflowAction;
  count: number;
  probability: number;
}

export interface WorkflowPrediction {
  source: WorkflowAction;
  action: WorkflowAction;
  probability: number;
  observations: number;
  alternatives: WorkflowOutcome[];
}

/**
 * Transparent first-order model of task-workflow events.
 * It stores event categories only; task text, IDs, and user data never enter the model.
 */
export class WorkflowTransitionModel {
  private readonly transitions = new Map<WorkflowAction, Map<WorkflowAction, number>>();
  private observations = 0;

  observe(from: WorkflowAction, to: WorkflowAction): void {
    const outcomes = this.transitions.get(from) ?? new Map<WorkflowAction, number>();
    outcomes.set(to, (outcomes.get(to) ?? 0) + 1);
    this.transitions.set(from, outcomes);
    this.observations += 1;
  }

  predictNext(source: WorkflowAction): WorkflowPrediction | null {
    const outcomes = this.transitions.get(source);
    if (!outcomes || outcomes.size === 0) return null;

    const total = Array.from(outcomes.values()).reduce((sum, count) => sum + count, 0);
    const alternatives: WorkflowOutcome[] = Array.from(outcomes.entries())
      .map(([action, count]) => ({ action, count, probability: count / total }))
      .sort(
        (left, right) =>
          right.count - left.count || left.action.localeCompare(right.action),
      );

    const best = alternatives[0];
    if (!best) return null;

    return {
      source,
      action: best.action,
      probability: best.probability,
      observations: total,
      alternatives,
    };
  }

  get totalObservations(): number {
    return this.observations;
  }

  get uniqueTransitionCount(): number {
    let count = 0;
    for (const outcomes of this.transitions.values()) count += outcomes.size;
    return count;
  }

  reset(): void {
    this.transitions.clear();
    this.observations = 0;
  }
}
