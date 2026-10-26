import { Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { DecisionPolicy } from './decision-policy';
import type { AdaptiveDecision } from './decision-policy';
import { TransitionModel } from './transition-model';
import type { TransitionPrediction } from './transition-model';

export type ManagedRoute = 'dashboard' | 'users' | 'products' | 'settings' | 'adaptive';

export interface AdaptiveNavigationState {
  enabled: boolean;
  currentRoute: string | null;
  prediction: TransitionPrediction | null;
  decision: AdaptiveDecision;
  observations: number;
  uniqueTransitions: number;
  preloadsStarted: number;
  preloadsCompleted: number;
  preloadFailures: number;
  predictionHits: number;
  predictionMisses: number;
  preloadedRoutes: string[];
  lastEvent: string;
}

const ROUTE_PRELOADERS: Record<ManagedRoute, () => Promise<unknown>> = {
  dashboard: () => import('../../features/dashboard/dashboard.component'),
  users: () => import('../../features/users/users.component'),
  products: () => import('../../features/products/products.component'),
  settings: () => import('../../features/settings/settings.component'),
  adaptive: () => import('../../features/adaptive-runtime/adaptive-runtime.component'),
};

const INITIAL_DECISION: AdaptiveDecision = {
  shouldPreload: false,
  action: 'baseline',
  reason: 'Navigate between pages to collect local transition observations.',
};

/**
 * LNASF's first Angular reference implementation.
 *
 * The model observes only allowlisted route names in memory. No account data,
 * form values, product data, or remote telemetry are collected by this service.
 */
@Injectable({ providedIn: 'root' })
export class AdaptiveNavigationService {
  readonly minimumObservations = 3;
  readonly minimumProbability = 0.65;

  private readonly model = new TransitionModel();
  private readonly policy = new DecisionPolicy({
    minimumObservations: this.minimumObservations,
    minimumProbability: this.minimumProbability,
  });
  private readonly pendingRoutes = new Set<ManagedRoute>();
  private readonly preloadedRoutes = new Set<ManagedRoute>();
  private readonly visitedRoutes = new Set<ManagedRoute>();
  private enabled = true;
  private lastRoute: ManagedRoute | null = null;
  private lastSpeculation: { target: ManagedRoute } | null = null;

  private readonly stateSignal = signal<AdaptiveNavigationState>({
    enabled: true,
    currentRoute: null,
    prediction: null,
    decision: INITIAL_DECISION,
    observations: 0,
    uniqueTransitions: 0,
    preloadsStarted: 0,
    preloadsCompleted: 0,
    preloadFailures: 0,
    predictionHits: 0,
    predictionMisses: 0,
    preloadedRoutes: [],
    lastEvent: 'Waiting for navigation events.',
  });

  readonly state = this.stateSignal.asReadonly();

  constructor(private readonly router: Router) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.handleNavigation(event.urlAfterRedirects));
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    this.stateSignal.update((state) => ({
      ...state,
      enabled,
      lastEvent: enabled
        ? 'Adaptive preloading enabled. The existing learned model remains available.'
        : 'Adaptive preloading disabled. Route observation continues; navigation uses the baseline.',
    }));

    if (enabled && this.lastRoute) {
      this.reconsiderCurrentRoute(this.lastRoute);
    } else if (!enabled) {
      this.stateSignal.update((state) => ({
        ...state,
        decision: {
          shouldPreload: false,
          action: 'baseline',
          reason: 'Adaptive preloading is disabled; normal navigation remains unchanged.',
        },
      }));
    }
  }

  resetLearning(): void {
    this.model.reset();
    this.lastSpeculation = null;

    this.stateSignal.update((state) => ({
      ...state,
      currentRoute: this.lastRoute,
      prediction: null,
      decision: INITIAL_DECISION,
      observations: 0,
      uniqueTransitions: 0,
      lastEvent:
        'Learned transition history reset. Continue navigating to train a fresh in-memory model.',
    }));
  }

  private handleNavigation(url: string): void {
    const route = normalizeManagedRoute(url);

    if (!route) {
      this.lastRoute = null;
      this.lastSpeculation = null;
      this.stateSignal.update((state) => ({
        ...state,
        currentRoute: null,
        prediction: null,
        decision: INITIAL_DECISION,
        lastEvent: 'A route outside the managed allowlist was ignored.',
      }));
      return;
    }

    if (this.lastSpeculation) {
      if (this.lastSpeculation.target === route) {
        this.stateSignal.update((state) => ({
          ...state,
          predictionHits: state.predictionHits + 1,
          lastEvent: 'The next navigation matched the last completed speculative preload.',
        }));
      } else {
        this.stateSignal.update((state) => ({
          ...state,
          predictionMisses: state.predictionMisses + 1,
          lastEvent: 'The next navigation differed from the last completed speculative preload.',
        }));
      }

      this.lastSpeculation = null;
    }

    if (this.lastRoute) {
      this.model.observe(this.lastRoute, route);
    }

    this.visitedRoutes.add(route);
    this.lastRoute = route;
    this.reconsiderCurrentRoute(route);
  }

  private reconsiderCurrentRoute(route: ManagedRoute): void {
    const prediction = this.model.predictNext(route);
    const targetIsKnown = prediction !== null && isManagedRoute(prediction.target);
    const alreadyLoaded =
      prediction !== null &&
      (this.visitedRoutes.has(prediction.target as ManagedRoute) ||
        this.preloadedRoutes.has(prediction.target as ManagedRoute) ||
        this.pendingRoutes.has(prediction.target as ManagedRoute));
    const decision = this.policy.evaluate(
      prediction,
      targetIsKnown,
      alreadyLoaded,
      this.enabled,
      this.pendingRoutes.size === 0,
    );

    this.stateSignal.update((state) => ({
      ...state,
      enabled: this.enabled,
      currentRoute: route,
      prediction,
      decision,
      observations: this.model.totalObservations,
      uniqueTransitions: this.model.uniqueTransitionCount,
      preloadedRoutes: Array.from(this.preloadedRoutes).sort(),
      lastEvent: this.model.totalObservations
        ? 'Route history updated locally; the decision policy evaluated the current prediction.'
        : 'Collect more route transitions to establish a usable prediction.',
    }));

    if (decision.shouldPreload && prediction) {
      void this.preload(prediction);
    }
  }

  private async preload(prediction: TransitionPrediction): Promise<void> {
    if (!isManagedRoute(prediction.target)) {
      return;
    }

    const target = prediction.target;

    if (
      this.visitedRoutes.has(target) ||
      this.pendingRoutes.has(target) ||
      this.preloadedRoutes.has(target)
    ) {
      return;
    }

    this.pendingRoutes.add(target);
    this.stateSignal.update((state) => ({
      ...state,
      preloadsStarted: state.preloadsStarted + 1,
      lastEvent:
        'Starting a speculative code-chunk load for ' +
        target +
        ' at ' +
        Math.round(prediction.probability * 100) +
        '% observed transition probability.',
    }));

    try {
      await ROUTE_PRELOADERS[target]();
      this.preloadedRoutes.add(target);

      if (this.lastRoute === prediction.source) {
        this.lastSpeculation = { target };
      }

      this.stateSignal.update((state) => ({
        ...state,
        preloadsCompleted: state.preloadsCompleted + 1,
        preloadedRoutes: Array.from(this.preloadedRoutes).sort(),
        lastEvent: 'Speculative code-chunk load completed for ' + target + '.',
      }));
    } catch {
      this.stateSignal.update((state) => ({
        ...state,
        preloadFailures: state.preloadFailures + 1,
        decision: {
          shouldPreload: false,
          action: 'baseline',
          reason:
            'Speculative preloading failed safely. The router can still load the page on demand.',
        },
        lastEvent:
          'Speculative preloading failed for ' + target + '; on-demand navigation remains available.',
      }));
    } finally {
      this.pendingRoutes.delete(target);
    }
  }
}

function normalizeManagedRoute(url: string): ManagedRoute | null {
  const pathname = (url.split(/[?#]/, 1)[0] ?? '')
    .split('/')
    .filter(Boolean)
    .join('/');

  const candidate = pathname || 'dashboard';
  return isManagedRoute(candidate) ? candidate : null;
}

function isManagedRoute(route: string): route is ManagedRoute {
  return Object.prototype.hasOwnProperty.call(ROUTE_PRELOADERS, route);
}
