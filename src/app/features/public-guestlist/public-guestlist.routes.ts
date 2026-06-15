import { Routes } from '@angular/router';

export const PUBLIC_GUESTLIST_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./public-guestlist.component').then(m => m.PublicGuestlistComponent),
  },
];
