import { ApplicationConfig, provideZonelessChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr-CH';
import {
  MAT_TOOLTIP_DEFAULT_OPTIONS,
  MatTooltipDefaultOptions,
} from '@angular/material/tooltip';
import { routes } from './app.routes';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'fr-CH' },
    // ── Correctif scroll tactile (iOS/Android) ────────────────────────
    // MatTooltip applique `touch-action: none` en inline sur son élément
    // hôte dès qu'il détecte un appareil tactile. Nos tables et listes
    // portent un tooltip sur chaque ligne : le geste de défilement démarrant
    // toujours sur une ligne, la zone devenait impossible à faire défiler.
    // Un tooltip n'a de toute façon aucun sens sans survol → on désactive
    // la gestion tactile globalement.
    {
      provide: MAT_TOOLTIP_DEFAULT_OPTIONS,
      useValue: {
        // Ces trois valeurs sont celles de la factory par défaut de Material.
        // Elles doivent être répétées : le constructeur de MatTooltip lit
        // `showDelay`/`hideDelay` sans garde, un objet partiel les mettrait
        // à `undefined`.
        showDelay: 0,
        hideDelay: 0,
        touchendHideDelay: 1500,
        touchGestures: 'off',
      } as MatTooltipDefaultOptions,
    },
  ],
};
