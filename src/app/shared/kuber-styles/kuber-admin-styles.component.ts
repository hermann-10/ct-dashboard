import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

/**
 * Porte-styles du thème Kuber admin.
 *
 * Le thème est volumineux (~60 kB de CSS) et ne sert qu'au shell admin.
 * En le rattachant à ce composant vide en `ViewEncapsulation.None`, il
 * part dans le chunk lazy de /admin au lieu du bundle initial, tout en
 * restant global (nécessaire : il cible aussi la .cdk-overlay-container,
 * hors du DOM du composant).
 *
 * L'encapsulation `None` est isolée ici : ce composant n'a pas d'autre
 * style, donc rien d'autre ne fuit.
 */
@Component({
  selector: 'kuber-admin-styles',
  standalone: true,
  template: '',
  // Hôte retiré du flux : sans ça, l'élément vide crée une boîte inline
  // qui décale la page de la hauteur d'une ligne.
  host: { style: 'display: none' },
  styleUrl: '../../../styles/kuber-admin.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KuberAdminStylesComponent {}
