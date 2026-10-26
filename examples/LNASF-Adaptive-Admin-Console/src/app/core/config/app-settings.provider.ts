import { Provider } from '@angular/core';

import { APP_SETTINGS } from './app-settings.token';

export const provideAppSettings = (): Provider => ({
  provide: APP_SETTINGS,
  useValue: {
    apiUrl: 'https://dummyjson.com',
    production: false,
  },
});
