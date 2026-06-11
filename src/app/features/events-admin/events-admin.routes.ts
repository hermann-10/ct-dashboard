import { Routes } from '@angular/router';

export const EVENTS_ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./events-admin.component').then(m => m.EventsAdminComponent),
  },
];
