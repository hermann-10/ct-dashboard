import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'app.hideAmounts';

/**
 * Mode discret partagé : masque les montants dans toute l'app admin
 * (Management, Dashboard, Documents) d'un seul geste. Persisté.
 */
@Injectable({ providedIn: 'root' })
export class PrivacyService {
  readonly hideAmounts = signal(localStorage.getItem(STORAGE_KEY) === '1');

  toggle(): void {
    this.hideAmounts.update(v => !v);
    localStorage.setItem(STORAGE_KEY, this.hideAmounts() ? '1' : '0');
  }
}
