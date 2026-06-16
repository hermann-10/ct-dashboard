import { Routes } from '@angular/router';

export const TRAFFIC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./traffic.component').then(m => m.TrafficComponent),
  },
];
