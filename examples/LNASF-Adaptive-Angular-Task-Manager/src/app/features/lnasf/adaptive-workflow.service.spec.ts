import { AdaptiveWorkflowService } from './adaptive-workflow.service';

describe('AdaptiveWorkflowService', () => {
  it('learns in Passive mode without surfacing a recommendation', () => {
    const service = new AdaptiveWorkflowService();

    service.recordAction('task:add');
    service.recordAction('task:complete');
    service.recordAction('task:add');
    service.recordAction('task:complete');
    service.recordAction('task:add');
    service.recordAction('task:complete');
    service.recordAction('task:add');

    const state = service.state();

    expect(state.mode).toBe('passive');
    expect(state.observations).toBe(6);
    expect(state.prediction?.action).toBe('task:complete');
    expect(state.prediction?.observations).toBe(3);
    expect(state.decision.shouldRecommend).toBeFalse();
  });

  it('separates advisory output from adaptive UI actions and measures feedback', () => {
    const service = new AdaptiveWorkflowService();

    service.recordAction('task:add');
    service.recordAction('task:complete');
    service.recordAction('task:add');
    service.recordAction('task:complete');
    service.recordAction('task:add');
    service.recordAction('task:complete');
    service.recordAction('task:add');

    service.setMode('advisory');
    expect(service.state().decision.shouldRecommend).toBeTrue();
    expect(service.state().decision.canApply).toBeFalse();

    service.recordAction('task:complete');
    expect(service.state().predictionHits).toBe(1);
    expect(service.state().predictionMisses).toBe(0);

    service.setMode('adaptive');
    expect(service.state().decision.shouldRecommend).toBeTrue();
    expect(service.state().decision.canApply).toBeTrue();
  });

  it('resets learned transitions and counters while retaining the selected mode', () => {
    const service = new AdaptiveWorkflowService();
    service.setMode('adaptive');
    service.recordAction('task:add');
    service.recordAction('task:complete');

    service.resetLearning();

    expect(service.state().mode).toBe('adaptive');
    expect(service.state().observations).toBe(0);
    expect(service.state().uniqueTransitions).toBe(0);
    expect(service.state().predictionHits).toBe(0);
    expect(service.state().predictionMisses).toBe(0);
    expect(service.state().prediction).toBeNull();
  });
});
