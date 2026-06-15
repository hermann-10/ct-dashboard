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
          <input matInput type="number" formControlName="amount" min="0" />
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevenueDialogComponent {
  readonly data = inject<RevenueDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<RevenueDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly sources = REVENUE_SOURCES;

  readonly form = this.fb.nonNullable.group({
    source: [this.data.revenue?.source ?? ('' as RevenueSource), Validators.required],
    label: [this.data.revenue?.label ?? '', Validators.required],
    amount: [this.data.revenue?.amount ?? 0, [Validators.required, Validators.min(0)]],
    is_received: [this.data.revenue?.is_received ?? false],
    notes: [this.data.revenue?.notes ?? ''],
  });

  onSave(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}
