import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

/**
 * Porte-styles du thème Kuber pour les pages d'authentification.
 *
 * Même principe que [KuberAdminStylesComponent] : chargé avec le chunk
 * lazy des pages login / register / forgot-password plutôt que dans le
 * bundle initial. `ViewEncapsulation.None` est indispensable car le CSS
 * cible le DOM interne des composants Material (.mat-mdc-card-content…).
 */
@Component({
  selector: 'kuber-auth-styles',
  standalone: true,
  template: '',
  // Hôte retiré du flux : sans ça, l'élément vide crée une boîte inline
  // qui décale la page de la hauteur d'une ligne.
  host: { style: 'display: none' },
  styleUrl: '../../../styles/kuber-auth.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KuberAuthStylesComponent {}
