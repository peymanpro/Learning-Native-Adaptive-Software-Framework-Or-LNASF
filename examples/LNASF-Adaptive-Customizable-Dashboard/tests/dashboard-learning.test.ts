import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendSectionObservation,
  DEFAULT_DASHBOARD_ORDER,
  MIN_TRANSITION_SUPPORT,
  moveSectionToFront,
  normalizeDashboardOrder,
  predictNextSection,
  type DashboardSection,
} from '../src/lib/lnasf/dashboard-learning';

test('repeated use of the same section does not inflate transition evidence', () => {
  const history: DashboardSection[] = ['metrics', 'metrics'];
  assert.deepEqual(appendSectionObservation(history, 'metrics'), history);
});

test('prediction gate opens only after enough support and confidence', () => {
  const history: DashboardSection[] = [
    'metrics', 'revenue', 'quick-actions',
    'metrics', 'revenue', 'orders',
    'metrics', 'revenue', 'quick-actions',
    'metrics',
  ];
  const prediction = predictNextSection(history);

  assert.ok(prediction);
  assert.equal(prediction.from, 'metrics');
  assert.equal(prediction.to, 'revenue');
  assert.equal(prediction.support, MIN_TRANSITION_SUPPORT);
  assert.equal(prediction.confidence, 1);
  assert.equal(prediction.gate, 'ready');
});

test('prediction remains gated when transition support is too small', () => {
  const prediction = predictNextSection(['metrics', 'revenue', 'metrics']);

  assert.ok(prediction);
  assert.equal(prediction.gate, 'insufficient-support');
});

test('prediction remains gated when the next-section confidence is too low', () => {
  const prediction = predictNextSection([
    'metrics', 'revenue', 'metrics', 'orders',
    'metrics', 'quick-actions', 'metrics',
  ]);

  assert.ok(prediction);
  assert.equal(prediction.support, 3);
  assert.equal(prediction.gate, 'low-confidence');
});

test('layout normalization restores missing sections and removes duplicates/unknown values', () => {
  assert.deepEqual(
    normalizeDashboardOrder(['orders', 'orders', 'not-a-section']),
    ['orders', ...DEFAULT_DASHBOARD_ORDER.filter((section) => section !== 'orders')],
  );
});

test('layout suggestions move the chosen section to the front without losing other sections', () => {
  assert.deepEqual(
    moveSectionToFront(DEFAULT_DASHBOARD_ORDER, 'orders'),
    ['orders', 'metrics', 'revenue', 'quick-actions'],
  );
});

test('session observation history remains bounded', () => {
  let history: DashboardSection[] = [];
  const cycle: DashboardSection[] = ['metrics', 'revenue', 'quick-actions', 'orders'];

  for (let index = 0; index < 124; index += 1) {
    history = appendSectionObservation(history, cycle[index % cycle.length]);
  }

  assert.equal(history.length, 100);
  assert.deepEqual(history.slice(-4), cycle);
});
