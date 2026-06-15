import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GuestlistEntry } from '../../event-management.model';

export interface GuestDialogData {
  mode: 'create' | 'edit';
  entry?: GuestlistEntry;
  currentCount: number;
  quota: number;
}

@Component({
  selector: 'app-guest-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.mode === 'create' ? 'Ajouter un invité' : 'Modifier l\\'invité' }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Nom de l'invité</mat-label>
          <input matInput formControlName="guest_name" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Accompagnants</mat-label>
          <input matInput type="number" formControlName="accompagnants" min="0" max="5" />
          <mat-hint>Nombre de +1 (max 5)</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Remarques</mat-label>
          <textarea matInput formControlName="remarks" rows="2"></textarea>
        </mat-form-field>
      </form>

      @if (data.mode === 'create' && remainingSpots <= 0) {
        <p class="quota-warning">
          <mat-icon>warning</mat-icon>
          La guestlist est pleine ({{ data.currentCount }}/{{ data.quota }})
        </p>
      }
      @if (data.mode === 'create' && remainingSpots > 0 && wouldExceedQuota) {
        <p class="quota-warning">
          <mat-icon>warning</mat-icon>
          Trop d'accompagnants — {{ remainingSpots }} place{{ remainingSpots > 1 ? 's' : '' }} restante{{ remainingSpots > 1 ? 's' : '' }} ({{ 1 + form.get('accompagnants')?.value }} demandée{{ (1 + form.get('accompagnants')?.value) > 1 ? 's' : '' }})
        </p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid || (data.mode === 'create' && (remainingSpots <= 0 || wouldExceedQuota))"
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
    .quota-warning {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #ef4444;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestDialogComponent {
  readonly data = inject<GuestDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<GuestDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly remainingSpots = this.data.quota - this.data.currentCount;

  readonly form = this.fb.nonNullable.group({
    guest_name: [this.data.entry?.guest_name ?? '', Validators.required],
    accompagnants: [this.data.entry?.accompagnants ?? 0, [Validators.min(0), Validators.max(5)]],
    remarks: [this.data.entry?.remarks ?? ''],
  });

  get wouldExceedQuota(): boolean {
    const accompagnants = this.form.get('accompagnants')?.value ?? 0;
    return (1 + accompagnants) > this.remainingSpots;
  }

  onSave(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}
