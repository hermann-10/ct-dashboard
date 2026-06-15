import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { ChargeCategory, CHARGE_CATEGORIES, EventCharge } from '../../event-management.model';

export interface ChargeDialogData {
  mode: 'create' | 'edit';
  charge?: EventCharge;
}

@Component({
  selector: 'app-charge-dialog',
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
      {{ data.mode === 'create' ? 'Ajouter une charge' : 'Modifier la charge' }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Catégorie</mat-label>
          <mat-select formControlName="category">
            @for (cat of categories; track cat.value) {
              <mat-option [value]="cat.value">{{ cat.label }}</mat-option>
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

        <mat-slide-toggle formControlName="is_paid">Payée</mat-slide-toggle>

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
export class ChargeDialogComponent {
  readonly data = inject<ChargeDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ChargeDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly categories = CHARGE_CATEGORIES;

  readonly form = this.fb.nonNullable.group({
    category: [this.data.charge?.category ?? ('' as ChargeCategory), Validators.required],
    label: [this.data.charge?.label ?? '', Validators.required],
    amount: [this.data.charge?.amount ?? 0, [Validators.required, Validators.min(0)]],
    is_paid: [this.data.charge?.is_paid ?? false],
    notes: [this.data.charge?.notes ?? ''],
  });

  onSave(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}
