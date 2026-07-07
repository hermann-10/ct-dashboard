import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../../features/auth/auth.store';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  // Wait for auth initialization (includes profile load) before checking
  await auth.whenInitialized();

  if (!auth.user()) {
    return router.createUrlTree(['/login']);
  }

  // Only admin role can access protected routes
  if (!auth.isAdmin()) {
    return router.createUrlTree(['/login']);
  }

  return true;
};
