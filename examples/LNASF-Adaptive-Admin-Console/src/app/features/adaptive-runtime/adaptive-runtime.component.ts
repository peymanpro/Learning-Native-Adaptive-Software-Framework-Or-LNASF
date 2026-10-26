import { Component, inject } from '@angular/core';

import { AdaptiveNavigationService } from '../../core/lnasf/adaptive-navigation.service';

@Component({
  selector: 'app-adaptive-runtime',
  standalone: true,
  templateUrl: './adaptive-runtime.component.html',
  styleUrl: './adaptive-runtime.component.scss',
})
export class AdaptiveRuntimeComponent {
  protected readonly runtime = inject(AdaptiveNavigationService);
  protected readonly state = this.runtime.state;

  protected toggleAdaptation(): void {
    this.runtime.setEnabled(!this.state().enabled);
  }

  protected resetLearning(): void {
    this.runtime.resetLearning();
  }

  protected formatProbability(probability: number | undefined): string {
    return probability === undefined ? '—' : Math.round(probability * 100) + '%';
  }

  protected formatRoute(route: string | null): string {
    return route ? '/' + route : '—';
  }
}
