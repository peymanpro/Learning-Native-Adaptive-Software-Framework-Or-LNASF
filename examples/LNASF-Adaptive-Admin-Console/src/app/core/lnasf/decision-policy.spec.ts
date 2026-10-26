import { DecisionPolicy } from './decision-policy';
import type { TransitionPrediction } from './transition-model';

describe('DecisionPolicy', () => {
  const policy = new DecisionPolicy();
  const prediction: TransitionPrediction = {
    source: 'dashboard',
    target: 'products',
    probability: 2 / 3,
    observations: 3,
    alternatives: [
      { route: 'products', count: 2, probability: 2 / 3 },
      { route: 'users', count: 1, probability: 1 / 3 },
    ],
  };

  it('allows preloading when evidence, target, and budget satisfy policy', () => {
    const decision = policy.evaluate(prediction, true, false, true, true);

    expect(decision.shouldPreload).toBeTrue();
    expect(decision.action).toBe('preload');
  });

  it('keeps deterministic navigation when evidence is insufficient', () => {
    const decision = policy.evaluate(
      { ...prediction, observations: 2 },
      true,
      false,
      true,
      true,
    );

    expect(decision.shouldPreload).toBeFalse();
    expect(decision.action).toBe('baseline');
  });

  it('rejects predictions below the probability threshold', () => {
    const decision = policy.evaluate(
      { ...prediction, probability: 0.6 },
      true,
      false,
      true,
      true,
    );

    expect(decision.shouldPreload).toBeFalse();
  });

  it('never preloads a target outside the allowlist', () => {
    const decision = policy.evaluate(prediction, false, false, true, true);

    expect(decision.shouldPreload).toBeFalse();
    expect(decision.reason).toContain('allowlist');
  });

  it('does not preload routes already visited in this session', () => {
    const decision = policy.evaluate(prediction, true, true, true, true);

    expect(decision.shouldPreload).toBeFalse();
    expect(decision.reason).toContain('already loaded');
  });

  it('respects the global speculative-work budget', () => {
    const decision = policy.evaluate(prediction, true, false, true, false);

    expect(decision.shouldPreload).toBeFalse();
    expect(decision.reason).toContain('budget');
  });

  it('keeps baseline behavior when adaptation is disabled', () => {
    const decision = policy.evaluate(prediction, true, false, false, true);

    expect(decision.shouldPreload).toBeFalse();
    expect(decision.reason).toContain('disabled');
  });
});
