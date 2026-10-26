export interface RouteOutcome {
  route: string;
  count: number;
  probability: number;
}

export interface TransitionPrediction {
  source: string;
  target: string;
  probability: number;
  observations: number;
  alternatives: RouteOutcome[];
}

/**
 * A small, transparent first-order transition model.
 *
 * It estimates P(nextRoute | currentRoute) from observed route transitions.
 * The model is intentionally framework-independent and keeps no user identity
 * or external telemetry. Its lifetime is the current application session.
 */
export class TransitionModel {
  private readonly transitions = new Map<string, Map<string, number>>();
  private observations = 0;

  observe(from: string, to: string): void {
    const source = normalizeRoute(from);
    const target = normalizeRoute(to);

    if (!source || !target || source === target) {
      return;
    }

    const outcomes = this.transitions.get(source) ?? new Map<string, number>();
    outcomes.set(target, (outcomes.get(target) ?? 0) + 1);
    this.transitions.set(source, outcomes);
    this.observations += 1;
  }

  predictNext(source: string): TransitionPrediction | null {
    const normalizedSource = normalizeRoute(source);
    const outcomes = this.transitions.get(normalizedSource);

    if (!outcomes || outcomes.size === 0) {
      return null;
    }

    const total = Array.from(outcomes.values()).reduce((sum, count) => sum + count, 0);
    const alternatives: RouteOutcome[] = Array.from(outcomes.entries())
      .map(([route, count]) => ({
        route,
        count,
        probability: count / total,
      }))
      .sort((left, right) => right.count - left.count || left.route.localeCompare(right.route));

    const best = alternatives[0];

    if (!best) {
      return null;
    }

    return {
      source: normalizedSource,
      target: best.route,
      probability: best.probability,
      observations: total,
      alternatives,
    };
  }

  get totalObservations(): number {
    return this.observations;
  }

  get uniqueTransitionCount(): number {
    let count = 0;

    for (const outcomes of this.transitions.values()) {
      count += outcomes.size;
    }

    return count;
  }

  reset(): void {
    this.transitions.clear();
    this.observations = 0;
  }
}

function normalizeRoute(route: string): string {
  return route.trim().split('/').filter(Boolean).join('/');
}
