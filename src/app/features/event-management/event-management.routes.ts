import { Routes } from '@angular/router';

export const EVENT_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./event-management.component').then(m => m.EventManagementComponent),
  },
];
