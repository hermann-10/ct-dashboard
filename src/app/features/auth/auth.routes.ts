import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
  },
];

export const REGISTER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent),
  },
];

export const FORGOT_PASSWORD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
];
