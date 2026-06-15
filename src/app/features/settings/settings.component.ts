import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
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
    MatTooltipModule,
    MatDividerModule,
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
            <mat-hint>Trouve-le dans Meta Business Suite &rarr; Sources de données &rarr; Pixels</mat-hint>
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

        <!-- Google Analytics -->
        <section class="settings-section">
          <div class="section-header">
            <mat-icon class="section-icon">monitoring</mat-icon>
            <div>
              <h3>Google Analytics</h3>
              <p class="section-desc">
                Ajoute ton Measurement ID Google Analytics 4 pour suivre le trafic et les comportements sur tes pages événement.
              </p>
            </div>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Measurement ID</mat-label>
            <input matInput [(ngModel)]="gaMeasurementId" placeholder="Ex: G-XXXXXXXXXX" />
            <mat-hint>Trouve-le dans Google Analytics &rarr; Admin &rarr; Data Streams</mat-hint>
          </mat-form-field>

          <div class="actions">
            <button mat-flat-button color="primary" (click)="onSaveGA()" [disabled]="saving()">
              @if (!saving()) {
                <mat-icon>save</mat-icon>
              }
              {{ saving() ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
            @if (gaMeasurementId) {
              <button mat-stroked-button color="warn" (click)="onRemoveGA()" [disabled]="saving()">
                <mat-icon>delete</mat-icon>
                Supprimer
              </button>
            }
          </div>

          @if (gaMeasurementId) {
            <div class="status-ok">
              <mat-icon>check_circle</mat-icon>
              GA4 actif — ID : {{ gaMeasurementId }}
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

        <!-- Informations de l'organisateur -->
        <section class="settings-section">
          <div class="section-header">
            <mat-icon class="section-icon">business</mat-icon>
            <div>
              <h3>Informations de l'organisateur</h3>
              <p class="section-desc">
                Ces informations apparaissent sur tes factures, e-mails de confirmation et pages publiques.
              </p>
            </div>
          </div>

          <div class="form-grid">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nom de l'organisation</mat-label>
              <input matInput [(ngModel)]="orgName" placeholder="Ex: HM Events Sarl" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>E-mail de contact</mat-label>
              <input matInput [(ngModel)]="orgEmail" type="email" placeholder="Ex: contact@hm-events.ch" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Téléphone</mat-label>
              <input matInput [(ngModel)]="orgPhone" type="tel" placeholder="Ex: +41 79 123 45 67" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Site web</mat-label>
              <input matInput [(ngModel)]="orgWebsite" placeholder="Ex: https://hm-events.ch" />
            </mat-form-field>
          </div>

          <div class="actions">
            <button mat-flat-button color="primary" (click)="onSaveOrgInfo()" [disabled]="saving()">
              @if (!saving()) {
                <mat-icon>save</mat-icon>
              }
              {{ saving() ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </section>

        <!-- Personnalisation -->
        <section class="settings-section">
          <div class="section-header">
            <mat-icon class="section-icon">palette</mat-icon>
            <div>
              <h3>Personnalisation</h3>
              <p class="section-desc">
                Personnalise l'apparence et les valeurs par défaut de tes événements.
              </p>
            </div>
          </div>

          <div class="form-grid">
            <div class="color-field">
              <label class="color-label">Couleur de marque</label>
              <div class="color-picker-row">
                <input
                  type="color"
                  [(ngModel)]="brandColor"
                  class="color-input"
                />
                <span class="color-value">{{ brandColor }}</span>
                <button
                  mat-icon-button
                  matTooltip="Réinitialiser la couleur par défaut"
                  (click)="brandColor = '#6C5CE7'"
                  class="color-reset-btn"
                >
                  <mat-icon>restart_alt</mat-icon>
                </button>
              </div>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Ville par défaut</mat-label>
              <input matInput [(ngModel)]="defaultCity" placeholder="Ex: Geneve" />
              <mat-hint>Ville pré-remplie lors de la creation d'un événement</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Devise par défaut</mat-label>
              <input matInput [(ngModel)]="defaultCurrency" placeholder="Ex: CHF" />
              <mat-hint>Devise utilisée pour les prix et factures</mat-hint>
            </mat-form-field>
          </div>

          <div class="actions">
            <button mat-flat-button color="primary" (click)="onSaveCustomization()" [disabled]="saving()">
              @if (!saving()) {
                <mat-icon>save</mat-icon>
              }
              {{ saving() ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </section>

        <!-- Danger Zone -->
        <section class="settings-section danger-section">
          <div class="section-header">
            <mat-icon class="section-icon danger-icon">warning</mat-icon>
            <div>
              <h3 class="danger-title">Zone dangereuse</h3>
              <p class="section-desc">
                Actions irréversibles. Procede avec précaution.
              </p>
            </div>
          </div>

          <div class="danger-item">
            <div class="danger-item-info">
              <strong>Effacer toutes les données analytics</strong>
              <p>Supprime définitivement toutes les données de tracking (visites, conversions, UTM).
                 Les parametres (Pixel ID, GA ID) seront conservés.</p>
            </div>
            <button mat-stroked-button color="warn" (click)="onClearAnalytics()" [disabled]="saving()">
              <mat-icon>delete_forever</mat-icon>
              Effacer les données
            </button>
          </div>

          <div class="danger-notice">
            <mat-icon>info</mat-icon>
            <span>Cette action est irréversible. Les données supprimées ne pourront pas être récupérées.</span>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .settings-page {
      padding: 1.5rem;
      max-width: 700px;
    }

    h2 {
      margin: 0 0 1.5rem;
      font-size: 1.4rem;
      font-weight: 600;
    }

    .settings-section {
      background: var(--hm-surface, #fff);
      border-radius: var(--hm-radius-md, 12px);
      padding: 1.5rem;
      margin-bottom: 1.25rem;
      box-shadow: var(--hm-shadow-sm, 0 1px 3px rgba(0,0,0,0.06));
      border: 1px solid var(--hm-border-light, #f3f4f6);
    }

    .section-header {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.25rem;
      h3 { margin: 0; font-size: 1.1rem; font-weight: 600; }
      .section-desc {
        margin: 0.25rem 0 0;
        color: #666;
        font-size: 0.875rem;
        line-height: 1.4;
      }
    }

    .section-icon {
      color: var(--hm-brand-accent, #e65100);
      font-size: 28px;
      width: 28px;
      height: 28px;
      margin-top: 2px;
    }

    .full-width { width: 100%; }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

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
      border-radius: var(--hm-radius-sm, 8px);
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
      border-radius: var(--hm-radius-sm, 8px);
      padding: 0.75rem 1rem;
      code {
        font-size: 0.8rem;
        color: #333;
        word-break: break-all;
        flex: 1;
      }
    }

    .utm-hint {
      font-size: 0.8rem;
      color: #888;
      margin: 0.5rem 0 0;
    }

    /* ── Color picker ── */
    .color-field {
      margin-bottom: 1rem;
    }

    .color-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #555;
      margin-bottom: 0.5rem;
    }

    .color-picker-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .color-input {
      width: 48px;
      height: 48px;
      border: 2px solid var(--hm-border, #e5e7eb);
      border-radius: var(--hm-radius-sm, 8px);
      cursor: pointer;
      padding: 2px;
      background: none;
      &:hover { border-color: var(--hm-brand-primary, #6C5CE7); }
    }

    .color-value {
      font-family: monospace;
      font-size: 0.9rem;
      color: #555;
      background: #f5f5f5;
      padding: 0.35rem 0.75rem;
      border-radius: var(--hm-radius-sm, 8px);
      letter-spacing: 0.5px;
    }

    .color-reset-btn {
      color: #999;
      &:hover { color: var(--hm-brand-primary, #6C5CE7); }
    }

    /* ── Danger zone ── */
    .danger-section {
      border: 1px solid #fca5a5;
      background: #fef2f2;
    }

    .danger-icon {
      color: #dc2626 !important;
    }

    .danger-title {
      color: #dc2626;
    }

    .danger-item {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.5rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.7);
      border-radius: var(--hm-radius-sm, 8px);
      border: 1px solid #fecaca;
    }

    .danger-item-info {
      flex: 1;
      strong {
        font-size: 0.925rem;
        color: #991b1b;
      }
      p {
        margin: 0.25rem 0 0;
        font-size: 0.825rem;
        color: #666;
        line-height: 1.4;
      }
    }

    .danger-notice {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      font-size: 0.8rem;
      color: #b91c1c;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .loading { display: flex; justify-content: center; padding: 3rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly snackBar = inject(MatSnackBar);

  loading = signal(true);
  saving = signal(false);

  // Facebook Pixel
  pixelId = '';

  // Google Analytics
  gaMeasurementId = '';

  // Informations organisateur
  orgName = '';
  orgEmail = '';
  orgPhone = '';
  orgWebsite = '';

  // Personnalisation
  brandColor = '#6C5CE7';
  defaultCity = '';
  defaultCurrency = 'CHF';

  async ngOnInit(): Promise<void> {
    try {
      const settings = await this.supabase.getSettings();
      this.pixelId = settings['fb_pixel_id'] ?? '';
      this.gaMeasurementId = settings['ga_measurement_id'] ?? '';
      this.orgName = settings['org_name'] ?? '';
      this.orgEmail = settings['org_email'] ?? '';
      this.orgPhone = settings['org_phone'] ?? '';
      this.orgWebsite = settings['org_website'] ?? '';
      this.brandColor = settings['brand_color'] ?? '#6C5CE7';
      this.defaultCity = settings['default_city'] ?? '';
      this.defaultCurrency = settings['default_currency'] ?? 'CHF';
    } finally {
      this.loading.set(false);
    }
  }

  // ── Facebook Pixel ──

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

  // ── Google Analytics ──

  async onSaveGA(): Promise<void> {
    this.saving.set(true);
    try {
      if (this.gaMeasurementId.trim()) {
        await this.supabase.upsertSetting('ga_measurement_id', this.gaMeasurementId.trim());
        this.snackBar.open('Google Analytics enregistré', 'OK', { duration: 3000 });
      }
    } catch {
      this.snackBar.open('Erreur lors de la sauvegarde', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async onRemoveGA(): Promise<void> {
    this.saving.set(true);
    try {
      await this.supabase.deleteSetting('ga_measurement_id');
      this.gaMeasurementId = '';
      this.snackBar.open('Google Analytics supprimé', 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Erreur lors de la suppression', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  // ── UTM ──

  copyUtmExample(): void {
    navigator.clipboard.writeText(
      'https://go.hm-events.ch/go/NOM-EVENT?utm_source=facebook&utm_medium=paid&utm_campaign=NOM-CAMPAGNE'
    );
    this.snackBar.open('Copié !', '', { duration: 1500 });
  }

  // ── Informations organisateur ──

  async onSaveOrgInfo(): Promise<void> {
    this.saving.set(true);
    try {
      const fields: Array<[string, string]> = [
        ['org_name', this.orgName.trim()],
        ['org_email', this.orgEmail.trim()],
        ['org_phone', this.orgPhone.trim()],
        ['org_website', this.orgWebsite.trim()],
      ];
      await Promise.all(
        fields
          .filter(([, value]) => value.length > 0)
          .map(([key, value]) => this.supabase.upsertSetting(key, value))
      );
      this.snackBar.open('Informations organisateur enregistrées', 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Erreur lors de la sauvegarde', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  // ── Personnalisation ──

  async onSaveCustomization(): Promise<void> {
    this.saving.set(true);
    try {
      const fields: Array<[string, string]> = [
        ['brand_color', this.brandColor],
        ['default_city', this.defaultCity.trim()],
        ['default_currency', this.defaultCurrency.trim() || 'CHF'],
      ];
      await Promise.all(
        fields.map(([key, value]) => this.supabase.upsertSetting(key, value))
      );
      this.snackBar.open('Personnalisation enregistrée', 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Erreur lors de la sauvegarde', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  // ── Danger zone ──

  async onClearAnalytics(): Promise<void> {
    if (!confirm('Effacer toutes les données analytics ? Cette action est irréversible.')) {
      return;
    }
    this.saving.set(true);
    try {
      const keysToDelete = [
        'analytics_visits',
        'analytics_conversions',
        'analytics_utm_data',
      ];
      await Promise.all(keysToDelete.map(key => this.supabase.deleteSetting(key)));
      this.snackBar.open('Données analytics effacées', 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Erreur lors de la suppression', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }
}
