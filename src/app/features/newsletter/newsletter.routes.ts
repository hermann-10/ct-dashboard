import { Routes } from '@angular/router';

export const NEWSLETTER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./newsletter.component').then(m => m.NewsletterComponent),
  },
];
