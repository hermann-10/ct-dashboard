import { Routes } from '@angular/router';

export const EVENT_DETAIL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./event-detail.component').then(m => m.EventDetailComponent),
  },
];
