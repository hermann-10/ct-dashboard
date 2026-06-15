import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="settings-page">
      <h2>Paramètres</h2>

      @if (loading()) {
        <div class="loading">
          <mat-spinner diameter="32" />
        </div>
      } @else {
        <!-- Facebook Pixel -->
        <section class="settings-section">
          <div class="section-header">
            <mat-icon class="section-icon">analytics</mat-icon>
            <div>
              <h3>Facebook Pixel</h3>
              <p class="section-desc">
                Connecte ton Pixel Meta pour tracker les visiteurs et mesurer les conversions de tes pubs Facebook/Instagram.
              </p>
            </div>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Pixel ID</mat-label>
            <input matInput [(ngModel)]="pixelId" placeholder="Ex: 123456789012345" />
            <mat-hint>Trouve-le dans Meta Business Suite → Sources de données → Pixels</mat-hint>
          </mat-form-field>

          <div class="actions">
            <button mat-flat-button color="primary" (click)="onSavePixel()" [disabled]="saving()">
              @if (!saving()) {
                <mat-icon>save</mat-icon>
              }
              {{ saving() ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
            @if (pixelId) {
              <button mat-stroked-button color="warn" (click)="onRemovePixel()" [disabled]="saving()">
                <mat-icon>delete</mat-icon>
                Supprimer
              </button>
            }
          </div>

          @if (pixelId) {
            <div class="status-ok">
              <mat-icon>check_circle</mat-icon>
              Pixel actif — ID : {{ pixelId }}
            </div>
          }
        </section>

        <!-- UTM Info -->
        <section class="settings-section">
          <div class="section-header">
            <mat-icon class="section-icon">link</mat-icon>
            <div>
              <h3>Liens de tracking (UTM)</h3>
              <p class="section-desc">
                Pour tes pubs Facebook/Instagram, utilise ces URLs avec les paramètres UTM pour suivre les conversions dans ton dashboard.
              </p>
            </div>
          </div>

          <div class="utm-example">
            <code>https://go.hm-events.ch/go/NOM-EVENT?utm_source=facebook&utm_medium=paid&utm_campaign=NOM-CAMPAGNE</code>
            <button mat-icon-button (click)="copyUtmExample()" matTooltip="Copier">
              <mat-icon>content_copy</mat-icon>
            </button>
          </div>
          <p class="utm-hint">
            Remplace <strong>NOM-EVENT</strong> par le slug de ton événement et <strong>NOM-CAMPAGNE</strong> par le nom de ta campagne.
          </p>
        </section>
      }
    </div>
  `,
  styles: [`
    .settings-page { padding: 1.5rem; max-width: 700px; }
    h2 { margin: 0 0 1.5rem; font-size: 1.4rem; font-weight: 600; }

    .settings-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }

    .section-header {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.25rem;
      h3 { margin: 0; font-size: 1.1rem; font-weight: 600; }
      .section-desc { margin: 0.25rem 0 0; color: #666; font-size: 0.875rem; line-height: 1.4; }
    }
    .section-icon { color: #e65100; font-size: 28px; width: 28px; height: 28px; margin-top: 2px; }

    .full-width { width: 100%; }

    .actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .status-ok {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.6rem 1rem;
      background: #f0fdf4;
      border-radius: 8px;
      color: #16a34a;
      font-size: 0.875rem;
      font-weight: 500;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .utm-example {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f5f5f5;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      code { font-size: 0.8rem; color: #333; word-break: break-all; flex: 1; }
    }
    .utm-hint { font-size: 0.8rem; color: #888; margin: 0.5rem 0 0; }

    .loading { display: flex; justify-content: center; padding: 3rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly snackBar = inject(MatSnackBar);

  loading = signal(true);
  saving = signal(false);
  pixelId = '';

  async ngOnInit(): Promise<void> {
    try {
      const settings = await this.supabase.getSettings();
      this.pixelId = settings['fb_pixel_id'] ?? '';
    } finally {
      this.loading.set(false);
    }
  }

  async onSavePixel(): Promise<void> {
    this.saving.set(true);
    try {
      if (this.pixelId.trim()) {
        await this.supabase.upsertSetting('fb_pixel_id', this.pixelId.trim());
        this.snackBar.open('Pixel Facebook enregistré', 'OK', { duration: 3000 });
      }
    } catch {
      this.snackBar.open('Erreur lors de la sauvegarde', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async onRemovePixel(): Promise<void> {
    this.saving.set(true);
    try {
      await this.supabase.deleteSetting('fb_pixel_id');
      this.pixelId = '';
      this.snackBar.open('Pixel supprimé', 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Erreur lors de la suppression', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  copyUtmExample(): void {
    navigator.clipboard.writeText(
      'https://go.hm-events.ch/go/NOM-EVENT?utm_source=facebook&utm_medium=paid&utm_campaign=NOM-CAMPAGNE'
    );
    this.snackBar.open('Copié !', '', { duration: 1500 });
  }
}
