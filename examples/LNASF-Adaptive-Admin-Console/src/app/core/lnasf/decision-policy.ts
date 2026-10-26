import type { TransitionPrediction } from './transition-model';

export interface DecisionPolicyConfig {
  minimumObservations: number;
  minimumProbability: number;
}

export interface AdaptiveDecision {
  shouldPreload: boolean;
  action: 'preload' | 'baseline';
  reason: string;
}

/**
 * Keeps prediction and action separate. Only a known route, enough observed
 * transitions, a sufficiently high empirical probability, and an available
 * speculative-work budget can authorize preloading.
 */
export class DecisionPolicy {
  constructor(
    readonly config: DecisionPolicyConfig = {
      minimumObservations: 3,
      minimumProbability: 0.65,
    },
  ) {}

  evaluate(
    prediction: TransitionPrediction | null,
    targetAvailable: boolean,
    alreadyLoaded: boolean,
    adaptationEnabled: boolean,
    budgetAvailable: boolean,
  ): AdaptiveDecision {
    if (!adaptationEnabled) {
      return baseline('Adaptive preloading is disabled; normal navigation remains unchanged.');
    }

    if (!prediction) {
      return baseline('No transition pattern has been learned for this page yet.');
    }

    if (!targetAvailable) {
      return baseline('The predicted target is not on the explicit preloading allowlist.');
    }

    if (alreadyLoaded) {
      return baseline('The predicted route is already loaded, loading, or preloaded.');
    }

    if (!budgetAvailable) {
      return baseline('The speculative-work budget is occupied; no additional route will be loaded.');
    }

    if (prediction.observations < this.config.minimumObservations) {
      return baseline(
        'More observations are needed from this page before taking an adaptive action.',
      );
    }

    if (prediction.probability < this.config.minimumProbability) {
      return baseline('The observed transition probability is below the configured threshold.');
    }

    return {
      shouldPreload: true,
      action: 'preload',
      reason:
        'The predicted route meets the evidence threshold and the speculative-work budget is available.',
    };
  }
}

function baseline(reason: string): AdaptiveDecision {
  return {
    shouldPreload: false,
    action: 'baseline',
    reason,
  };
}
