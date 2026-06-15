import { Routes } from '@angular/router';

export const ARTISTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./artists.component').then(m => m.ArtistsComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/artist-detail/artist-detail.component').then(m => m.ArtistDetailComponent),
  },
];
