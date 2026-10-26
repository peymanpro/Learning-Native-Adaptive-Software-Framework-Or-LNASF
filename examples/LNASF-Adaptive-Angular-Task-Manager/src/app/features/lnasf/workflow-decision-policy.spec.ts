import { WorkflowDecisionPolicy } from './workflow-decision-policy';
import type { WorkflowPrediction } from './workflow-transition-model';

describe('WorkflowDecisionPolicy', () => {
  let policy: WorkflowDecisionPolicy;

  const prediction = (observations: number, probability: number): WorkflowPrediction => ({
    source: 'task:add',
    action: 'task:complete',
    probability,
    observations,
    alternatives: [{ action: 'task:complete', count: observations, probability }],
  });

  beforeEach(() => {
    policy = new WorkflowDecisionPolicy(3, 0.65);
  });

  it('does not recommend with missing or insufficient evidence', () => {
    expect(policy.evaluate(null, 'adaptive').shouldRecommend).toBeFalse();
    expect(policy.evaluate(prediction(2, 1), 'adaptive').shouldRecommend).toBeFalse();
    expect(policy.evaluate(prediction(3, 0.64), 'adaptive').shouldRecommend).toBeFalse();
  });

  it('keeps Passive mode observational', () => {
    const decision = policy.evaluate(prediction(10, 0.9), 'passive');

    expect(decision.shouldRecommend).toBeFalse();
    expect(decision.canApply).toBeFalse();
    expect(decision.action).toBe('baseline');
  });

  it('separates Advisory recommendations from Adaptive UI actions', () => {
    const advisory = policy.evaluate(prediction(3, 2 / 3), 'advisory');
    const adaptive = policy.evaluate(prediction(3, 2 / 3), 'adaptive');

    expect(advisory.shouldRecommend).toBeTrue();
    expect(advisory.canApply).toBeFalse();
    expect(adaptive.shouldRecommend).toBeTrue();
    expect(adaptive.canApply).toBeTrue();
  });
});
