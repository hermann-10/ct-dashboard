import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="not-found">
      <mat-icon class="nf-icon">explore_off</mat-icon>
      <h1>404</h1>
      <p>Page introuvable</p>
      <a mat-flat-button color="primary" routerLink="/dashboard">Retour au dashboard</a>
    </div>
  `,
  styles: `
    .not-found {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 80vh; gap: 0.5rem;
    }
    .nf-icon { font-size: 4rem; width: 4rem; height: 4rem; opacity: 0.3; }
    h1 { font-size: 3rem; font-weight: 800; margin: 0; opacity: 0.4; }
    p { opacity: 0.5; margin-bottom: 1rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
