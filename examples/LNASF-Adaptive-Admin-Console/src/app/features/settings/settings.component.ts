import { Component, inject } from '@angular/core';

import { APP_SETTINGS } from '../../core/config/app-settings.token';
import { AppSettings } from '../../core/config/app-settings';
import { ButtonComponent } from '../../shared/ui/button/button.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  protected readonly settings: AppSettings = inject(APP_SETTINGS);

  protected readonly environmentLabel = this.settings.production ? 'Production' : 'Development';
}
