import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { EventStaff, StaffPayType } from '../../event-management.model';

export interface StaffDialogData {
  mode: 'create' | 'edit';
  /** Horaires par défaut de l'événement (pré-remplissage). */
  defaultStart?: string;
  defaultEnd?: string;
  staff?: EventStaff;
}

const ROLE_SUGGESTIONS = ['Serveuse', 'Barmaid', 'Caisse', 'DJ', 'Sécurité', 'Chef de rang', 'Accueil', 'Photo / Vidéo', 'Runner'];

@Component({
  selector: 'app-staff-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Ajouter du staff' : 'Modifier' }}</h2>

    <mat-dialog-content class="dialog-content">
      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Rôle</mat-label>
          <input matInput [(ngModel)]="form.role" required list="staff-roles" placeholder="Serveuse, Caisse, DJ…" />
          <datalist id="staff-roles">
            @for (r of roleSuggestions; track r) {
              <option [value]="r"></option>
            }
          </datalist>
        </mat-form-field>

        @if (data.mode === 'create') {
          <mat-form-field appearance="outline" class="count-field">
            <mat-label>Nombre</mat-label>
            <input matInput type="number" min="1" max="30" step="1" [(ngModel)]="count" />
          </mat-form-field>
        }
      </div>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Nom (optionnel)</mat-label>
          <input matInput [(ngModel)]="form.name" placeholder="À compléter plus tard" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Téléphone (optionnel)</mat-label>
          <input matInput [(ngModel)]="form.phone" placeholder="+41 …" />
        </mat-form-field>
      </div>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Rémunération</mat-label>
          <mat-select [(ngModel)]="form.pay_type">
            <mat-option value="hourly">Horaire (CHF / h)</mat-option>
            <mat-option value="flat">Forfait (CHF)</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ form.pay_type === 'flat' ? 'Forfait (CHF)' : 'Tarif (CHF / h)' }}</mat-label>
          <input matInput type="number" step="0.05" min="0" [(ngModel)]="form.rate" required />
        </mat-form-field>
      </div>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Début</mat-label>
          <input matInput type="time" [(ngModel)]="form.start_time" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fin</mat-label>
          <input matInput type="time" [(ngModel)]="form.end_time" />
        </mat-form-field>
      </div>
      <p class="hint">Le passage de minuit est géré automatiquement (ex. 23:00 → 05:00 = 6 h). Les horaires sont optionnels pour un forfait.</p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Notes</mat-label>
        <textarea matInput rows="2" [(ngModel)]="form.notes"></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!isValid()" (click)="onSave()">
        {{ data.mode === 'create' ? (count > 1 ? 'Ajouter ' + count + ' personnes' : 'Ajouter') : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content { display: flex; flex-direction: column; gap: 0.25rem; min-width: 480px; }
    .full-width { width: 100%; }
    .row { display: flex; gap: 1rem; }
    .row mat-form-field { flex: 1; }
    .count-field { max-width: 110px; }
    .hint { margin: -0.25rem 0 0.5rem; font-size: 0.75rem; color: #999; }
    @media (max-width: 560px) {
      .dialog-content { min-width: unset; }
      .row { flex-direction: column; gap: 0.25rem; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffDialogComponent {
  readonly data = inject<StaffDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<StaffDialogComponent>);

  readonly roleSuggestions = ROLE_SUGGESTIONS;

  count = 1;

  form = {
    role: this.data.staff?.role ?? '',
    name: this.data.staff?.name ?? '',
    phone: this.data.staff?.phone ?? '',
    pay_type: (this.data.staff?.pay_type ?? 'hourly') as StaffPayType,
    rate: this.data.staff?.rate ?? 25,
    start_time: this.data.staff?.start_time ?? this.data.defaultStart ?? '',
    end_time: this.data.staff?.end_time ?? this.data.defaultEnd ?? '',
    notes: this.data.staff?.notes ?? '',
  };

  isValid(): boolean {
    const rateOk = this.form.rate !== null && !isNaN(Number(this.form.rate)) && Number(this.form.rate) >= 0;
    const hoursOk = this.form.pay_type === 'flat' || (!!this.form.start_time && !!this.form.end_time);
    return !!this.form.role.trim() && rateOk && hoursOk;
  }

  onSave(): void {
    this.dialogRef.close({
      count: Math.max(1, Math.min(30, Math.round(Number(this.count)) || 1)),
      dto: {
        role: this.form.role.trim(),
        name: this.form.name.trim(),
        phone: this.form.phone.trim() || undefined,
        pay_type: this.form.pay_type,
        rate: Number(this.form.rate),
        start_time: this.form.start_time || undefined,
        end_time: this.form.end_time || undefined,
        notes: this.form.notes.trim() || undefined,
      },
    });
  }
}
