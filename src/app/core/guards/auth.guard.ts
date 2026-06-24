import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../../features/auth/auth.store';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  // Wait for auth initialization before checking the session
  await auth.whenInitialized();

  return auth.user() ? true : router.createUrlTree(['/login']);
};
