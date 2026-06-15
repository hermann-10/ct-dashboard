import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/home/home.routes').then(m => m.HOME_ROUTES),
  },
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  {
    path: 'guestlist/:token',
    loadChildren: () => import('./features/public-guestlist/public-guestlist.routes').then(m => m.PUBLIC_GUESTLIST_ROUTES),
  },
  {
    path: 'door/:slug',
    loadChildren: () => import('./features/door/door.routes').then(m => m.DOOR_ROUTES),
  },
  {
    path: 'checkin/:slug',
    canActivate: [authGuard],
    loadChildren: () => import('./features/checkin/checkin.routes').then(m => m.CHECKIN_ROUTES),
  },
  {
    path: 'dashboard',
    redirectTo: 'admin/dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    loadComponent: () => import('./shared/not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];
