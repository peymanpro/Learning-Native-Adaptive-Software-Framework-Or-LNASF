import { WorkflowTransitionModel } from './workflow-transition-model';

describe('WorkflowTransitionModel', () => {
  let model: WorkflowTransitionModel;

  beforeEach(() => {
    model = new WorkflowTransitionModel();
  });

  it('predicts the most frequent next action from observed transitions', () => {
    model.observe('task:add', 'task:complete');
    model.observe('task:add', 'task:complete');
    model.observe('task:add', 'filter:active');

    const prediction = model.predictNext('task:add');

    expect(prediction?.action).toBe('task:complete');
    expect(prediction?.observations).toBe(3);
    expect(prediction?.probability).toBeCloseTo(2 / 3);
    expect(prediction?.alternatives.length).toBe(2);
  });

  it('returns no prediction for an action without outgoing observations', () => {
    expect(model.predictNext('task:add')).toBeNull();
  });

  it('reports transition counts and clears all learned state on reset', () => {
    model.observe('task:add', 'task:complete');
    model.observe('task:add', 'task:complete');
    model.observe('filter:active', 'task:add');

    expect(model.totalObservations).toBe(3);
    expect(model.uniqueTransitionCount).toBe(2);

    model.reset();

    expect(model.totalObservations).toBe(0);
    expect(model.uniqueTransitionCount).toBe(0);
    expect(model.predictNext('task:add')).toBeNull();
  });
});
