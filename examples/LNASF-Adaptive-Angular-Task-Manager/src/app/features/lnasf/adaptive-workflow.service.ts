import { Injectable, signal } from '@angular/core';
import { WorkflowDecisionPolicy } from './workflow-decision-policy';
import type { WorkflowDecision, WorkflowMode } from './workflow-decision-policy';
import { WorkflowTransitionModel } from './workflow-transition-model';
import type { WorkflowAction, WorkflowPrediction } from './workflow-transition-model';

const INITIAL_DECISION: WorkflowDecision = {
  shouldRecommend: false,
  canApply: false,
  action: 'baseline',
  reason: 'Passive mode learns and measures without changing the task workflow.',
};

export interface AdaptiveWorkflowState {
  mode: WorkflowMode;
  lastAction: WorkflowAction | null;
  prediction: WorkflowPrediction | null;
  decision: WorkflowDecision;
  observations: number;
  uniqueTransitions: number;
  predictionHits: number;
  predictionMisses: number;
  lastEvent: string;
}

/**
 * Session-local LNASF adaptation for task workflows.
 * Only action categories are observed. No task content or identifiers are stored.
 */
@Injectable({ providedIn: 'root' })
export class AdaptiveWorkflowService {
  private readonly model = new WorkflowTransitionModel();
  private readonly policy = new WorkflowDecisionPolicy(3, 0.65);
  private lastAction: WorkflowAction | null = null;
  private pendingSuggestedAction: WorkflowAction | null = null;
  private mode: WorkflowMode = 'passive';

  private readonly stateSignal = signal<AdaptiveWorkflowState>({
    mode: 'passive',
    lastAction: null,
    prediction: null,
    decision: INITIAL_DECISION,
    observations: 0,
    uniqueTransitions: 0,
    predictionHits: 0,
    predictionMisses: 0,
    lastEvent: 'Waiting for task or filter actions.',
  });

  readonly state = this.stateSignal.asReadonly();

  recordAction(action: WorkflowAction): void {
    let hits = this.stateSignal().predictionHits;
    let misses = this.stateSignal().predictionMisses;

    if (this.pendingSuggestedAction) {
      if (this.pendingSuggestedAction === action) hits += 1;
      else misses += 1;
      this.pendingSuggestedAction = null;
    }

    if (this.lastAction) this.model.observe(this.lastAction, action);
    this.lastAction = action;

    const prediction = this.model.predictNext(action);
    const decision = this.policy.evaluate(prediction, this.mode);
    this.pendingSuggestedAction = decision.shouldRecommend ? prediction?.action ?? null : null;

    this.stateSignal.set({
      mode: this.mode,
      lastAction: action,
      prediction,
      decision,
      observations: this.model.totalObservations,
      uniqueTransitions: this.model.uniqueTransitionCount,
      predictionHits: hits,
      predictionMisses: misses,
      lastEvent: this.model.totalObservations
        ? 'Recorded one action category locally and evaluated the current mode policy.'
        : 'First action recorded; another action is needed to learn a transition.',
    });
  }

  setMode(mode: WorkflowMode): void {
    this.mode = mode;
    this.pendingSuggestedAction = null;
    const current = this.stateSignal();
    const decision = this.policy.evaluate(current.prediction, mode);

    this.stateSignal.set({
      ...current,
      mode,
      decision,
      lastEvent: this.modeMessage(mode),
    });

    if (decision.shouldRecommend && current.prediction) {
      this.pendingSuggestedAction = current.prediction.action;
    }
  }

  resetLearning(): void {
    this.model.reset();
    this.lastAction = null;
    this.pendingSuggestedAction = null;
    this.stateSignal.set({
      mode: this.mode,
      lastAction: null,
      prediction: null,
      decision: this.policy.evaluate(null, this.mode),
      observations: 0,
      uniqueTransitions: 0,
      predictionHits: 0,
      predictionMisses: 0,
      lastEvent: 'Session learning and evaluation counters were reset.',
    });
  }

  private modeMessage(mode: WorkflowMode): string {
    switch (mode) {
      case 'passive':
        return 'Passive mode: learn and measure, without displaying a recommendation.';
      case 'advisory':
        return 'Advisory mode: show eligible recommendations without action buttons.';
      case 'adaptive':
        return 'Adaptive mode: show eligible recommendations and user-triggered, non-destructive UI actions.';
    }
  }
}
