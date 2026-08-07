import { Routes } from '@angular/router';

export const LOGISTICS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./logistics.component').then(m => m.LogisticsComponent),
  },
];
