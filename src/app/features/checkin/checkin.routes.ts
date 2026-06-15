import { Routes } from '@angular/router';

export const CHECKIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./checkin.component').then(m => m.CheckinComponent),
  },
];
