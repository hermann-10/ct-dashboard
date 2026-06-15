import { Routes } from '@angular/router';

export const NOTIFICATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./notification-settings.component').then(m => m.NotificationSettingsComponent),
  },
];
