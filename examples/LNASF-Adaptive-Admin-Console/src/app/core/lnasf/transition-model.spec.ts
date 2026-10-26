import { TransitionModel } from './transition-model';

describe('TransitionModel', () => {
  let model: TransitionModel;

  beforeEach(() => {
    model = new TransitionModel();
  });

  it('returns no prediction before observing a transition', () => {
    expect(model.predictNext('dashboard')).toBeNull();
  });

  it('estimates next-route probability from observed transition frequencies', () => {
    model.observe('dashboard', 'products');
    model.observe('dashboard', 'products');
    model.observe('dashboard', 'users');

    const prediction = model.predictNext('dashboard');

    expect(prediction?.target).toBe('products');
    expect(prediction?.observations).toBe(3);
    expect(prediction?.probability).toBeCloseTo(2 / 3);
    expect(prediction?.alternatives.length).toBe(2);
    expect(model.totalObservations).toBe(3);
    expect(model.uniqueTransitionCount).toBe(2);
  });

  it('uses a deterministic route-name tie-break when frequencies are equal', () => {
    model.observe('dashboard', 'users');
    model.observe('dashboard', 'products');

    expect(model.predictNext('dashboard')?.target).toBe('products');
  });

  it('ignores empty routes and self-transitions', () => {
    model.observe('', 'products');
    model.observe('dashboard', '');
    model.observe('dashboard', 'dashboard');

    expect(model.totalObservations).toBe(0);
    expect(model.predictNext('dashboard')).toBeNull();
  });

  it('normalizes leading and trailing slashes', () => {
    model.observe('/dashboard/', '/products/');
    model.observe('dashboard', 'products');

    expect(model.predictNext('/dashboard')?.target).toBe('products');
    expect(model.predictNext('dashboard')?.observations).toBe(2);
  });

  it('clears learned counts when reset', () => {
    model.observe('dashboard', 'products');
    model.reset();

    expect(model.totalObservations).toBe(0);
    expect(model.uniqueTransitionCount).toBe(0);
    expect(model.predictNext('dashboard')).toBeNull();
  });
});
