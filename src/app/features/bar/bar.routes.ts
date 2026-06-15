import { Routes } from '@angular/router';

export const BAR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./bar.component').then(m => m.BarComponent),
  },
];
