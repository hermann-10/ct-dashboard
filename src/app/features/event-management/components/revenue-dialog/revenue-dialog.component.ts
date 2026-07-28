import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { RevenueSource, REVENUE_SOURCES, EventRevenue } from '../../event-management.model';

export interface RevenueDialogData {
  mode: 'create' | 'edit';
  revenue?: EventRevenue;
  /** Pré-remplir une ligne « Fonds de caisse : −150 » (aucune ligne existante) */
  suggestFloat?: boolean;
}

@Component({
  selector: 'app-revenue-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.mode === 'create' ? 'Ajouter un revenu' : 'Modifier le revenu' }}
    </h2>

    <mat-dialog-content>
      @if (floatSuggested) {
        <p class="float-hint">
          <mat-icon>info</mat-icon>
          Ligne pré-remplie : fonds de caisse −150 CHF. Ajuste le montant ou remplace tout pour saisir une autre recette.
        </p>
      }
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Source</mat-label>
          <mat-select formControlName="source">
            @for (src of sources; track src.value) {
              <mat-option [value]="src.value">{{ src.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Libellé</mat-label>
          <input matInput formControlName="label" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Montant (CHF)</mat-label>
          <input matInput type="number" formControlName="amount" />
          <mat-hint>Montant négatif accepté (ex : fonds de caisse −150)</mat-hint>
        </mat-form-field>

        <mat-slide-toggle formControlName="is_received">Reçu</mat-slide-toggle>

        <mat-form-field appearance="outline">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid"
        (click)="onSave()"
      >
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .float-hint {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 1rem;
      padding: 0.6rem 0.85rem;
      background: rgba(108, 92, 231, 0.08);
      color: #5b4bd5;
      border-radius: 8px;
      font-size: 0.8rem;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevenueDialogComponent {
  readonly data = inject<RevenueDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<RevenueDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly sources = REVENUE_SOURCES;

  /** Pré-remplissage fonds de caisse (création + aucune ligne existante) */
  readonly floatSuggested = this.data.mode === 'create' && !!this.data.suggestFloat;

  readonly form = this.fb.nonNullable.group({
    source: [
      this.data.revenue?.source ?? ((this.floatSuggested ? 'divers' : '') as RevenueSource),
      Validators.required,
    ],
    label: [this.data.revenue?.label ?? (this.floatSuggested ? 'Fonds de caisse' : ''), Validators.required],
    amount: [this.data.revenue?.amount ?? (this.floatSuggested ? -150 : 0), [Validators.required]],
    is_received: [this.data.revenue?.is_received ?? this.floatSuggested],
    notes: [this.data.revenue?.notes ?? ''],
  });

  onSave(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}
