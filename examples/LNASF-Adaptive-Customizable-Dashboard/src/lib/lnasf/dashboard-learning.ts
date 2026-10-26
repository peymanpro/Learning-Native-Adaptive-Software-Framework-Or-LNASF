export const DASHBOARD_SECTIONS = [
  'metrics',
  'revenue',
  'quick-actions',
  'orders',
] as const;

export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number];

export const DEFAULT_DASHBOARD_ORDER: DashboardSection[] = [
  'metrics',
  'revenue',
  'quick-actions',
  'orders',
];

export const DASHBOARD_SECTION_LABELS: Record<DashboardSection, string> = {
  metrics: 'Key metrics',
  revenue: 'Revenue overview',
  'quick-actions': 'Quick actions',
  orders: 'Recent orders',
};

export const MAX_SESSION_OBSERVATIONS = 100;
export const MIN_TRANSITION_SUPPORT = 3;
export const MIN_TRANSITION_CONFIDENCE = 0.65;

export type PredictionGate =
  | 'insufficient-support'
  | 'low-confidence'
  | 'ready';

export interface DashboardPrediction {
  from: DashboardSection;
  to: DashboardSection;
  support: number;
  matches: number;
  confidence: number;
  gate: PredictionGate;
}

/**
 * Keep a bounded, in-memory sequence of explicit section-use signals.
 * Consecutive duplicate selections do not inflate transition evidence.
 */
export function appendSectionObservation(
  history: DashboardSection[],
  section: DashboardSection,
): DashboardSection[] {
  if (history[history.length - 1] === section) {
    return history;
  }

  return [...history, section].slice(-MAX_SESSION_OBSERVATIONS);
}

/**
 * Predict the section most often used after the current section.
 * The decision gate is separate from prediction: a candidate can exist
 * without being eligible to drive a layout suggestion.
 */
export function predictNextSection(
  history: DashboardSection[],
): DashboardPrediction | null {
  if (history.length < 2) {
    return null;
  }

  const from = history[history.length - 1];
  const successors: DashboardSection[] = [];

  for (let index = 0; index < history.length - 1; index += 1) {
    if (history[index] === from && history[index + 1] !== from) {
      successors.push(history[index + 1]);
    }
  }

  if (successors.length === 0) {
    return null;
  }

  const counts = new Map<DashboardSection, number>();
  for (const successor of successors) {
    counts.set(successor, (counts.get(successor) ?? 0) + 1);
  }

  // Resolve ties deterministically using the default dashboard order.
  const to = [...counts.entries()].sort((left, right) => {
    const countDifference = right[1] - left[1];
    if (countDifference !== 0) {
      return countDifference;
    }

    return (
      DEFAULT_DASHBOARD_ORDER.indexOf(left[0]) -
      DEFAULT_DASHBOARD_ORDER.indexOf(right[0])
    );
  })[0][0];

  const support = successors.length;
  const matches = counts.get(to) ?? 0;
  const confidence = matches / support;
  const gate: PredictionGate =
    support < MIN_TRANSITION_SUPPORT
      ? 'insufficient-support'
      : confidence < MIN_TRANSITION_CONFIDENCE
        ? 'low-confidence'
        : 'ready';

  return { from, to, support, matches, confidence, gate };
}

export function normalizeDashboardOrder(
  candidate: unknown,
): DashboardSection[] {
  const allowed = new Set<string>(DASHBOARD_SECTIONS);
  const valid = Array.isArray(candidate)
    ? candidate.filter(
        (value): value is DashboardSection =>
          typeof value === 'string' && allowed.has(value),
      )
    : [];

  return [
    ...new Set<DashboardSection>([
      ...valid,
      ...DEFAULT_DASHBOARD_ORDER,
    ]),
  ];
}

export function moveSectionToFront(
  order: DashboardSection[],
  section: DashboardSection,
): DashboardSection[] {
  return [
    section,
    ...normalizeDashboardOrder(order).filter((item) => item !== section),
  ];
}
