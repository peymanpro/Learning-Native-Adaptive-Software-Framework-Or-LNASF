import type { WorkflowAction, WorkflowPrediction } from './workflow-transition-model';
import { WORKFLOW_ACTIONS } from './workflow-transition-model';

export type WorkflowMode = 'passive' | 'advisory' | 'adaptive';

export interface WorkflowDecision {
  shouldRecommend: boolean;
  canApply: boolean;
  action: 'recommend' | 'baseline';
  reason: string;
}

/**
 * Prediction is separate from a decision, and a decision is separate from action.
 * Even Adaptive mode offers only explicit, user-triggered, low-risk UI operations.
 */
export class WorkflowDecisionPolicy {
  constructor(
    readonly minimumObservations = 3,
    readonly minimumProbability = 0.65,
  ) {}

  evaluate(
    prediction: WorkflowPrediction | null,
    mode: WorkflowMode,
  ): WorkflowDecision {
    if (mode === 'passive') {
      return baseline('Passive mode learns and measures without showing or applying workflow recommendations.');
    }
    if (!prediction) {
      return baseline('No next-action pattern has been learned for this event yet.');
    }
    if (!isWorkflowAction(prediction.action)) {
      return baseline('The predicted action is outside the supported suggestion allowlist.');
    }
    if (prediction.observations < this.minimumObservations) {
      return baseline('More observations are needed before the system offers a workflow recommendation.');
    }
    if (prediction.probability < this.minimumProbability) {
      return baseline('The leading action is not frequent enough to meet the probability threshold.');
    }

    if (mode === 'advisory') {
      return {
        shouldRecommend: true,
        canApply: false,
        action: 'recommend',
        reason: 'The evidence threshold is met. Advisory mode reports the recommendation but leaves the workflow unchanged.',
      };
    }

    return {
      shouldRecommend: true,
      canApply: true,
      action: 'recommend',
      reason: 'The evidence threshold is met. An optional, non-destructive UI action is available for the user to choose.',
    };
  }
}

function isWorkflowAction(value: string): value is WorkflowAction {
  return (WORKFLOW_ACTIONS as readonly string[]).includes(value);
}

function baseline(reason: string): WorkflowDecision {
  return { shouldRecommend: false, canApply: false, action: 'baseline', reason };
}
