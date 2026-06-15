import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { ArtistRole, ARTIST_ROLES, EventLineup } from '../../event-management.model';

export interface LineupDialogData {
  mode: 'create' | 'edit';
  entry?: EventLineup;
}

@Component({
  selector: 'app-lineup-dialog',
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
      {{ data.mode === 'create' ? 'Ajouter un artiste' : 'Modifier l\\'artiste' }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Nom de l'artiste</mat-label>
          <input matInput formControlName="artist_name" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Rôle</mat-label>
          <mat-select formControlName="role">
            @for (r of roles; track r.value) {
              <mat-option [value]="r.value">{{ r.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Cachet (€)</mat-label>
          <input matInput type="number" formControlName="fee" min="0" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Créneau</mat-label>
          <input matInput formControlName="set_time" placeholder="ex: 22:00 - 23:30" />
        </mat-form-field>

        <mat-slide-toggle formControlName="is_confirmed">Confirmé</mat-slide-toggle>

        <mat-form-field appearance="outline">
          <mat-label>Contact</mat-label>
          <input matInput formControlName="contact_info" />
        </mat-form-field>

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
export class LineupDialogComponent {
  readonly data = inject<LineupDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<LineupDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly roles = ARTIST_ROLES;

  readonly form = this.fb.nonNullable.group({
    artist_name: [this.data.entry?.artist_name ?? '', Validators.required],
    role: [this.data.entry?.role ?? ('' as ArtistRole), Validators.required],
    fee: [this.data.entry?.fee ?? 0, Validators.min(0)],
    set_time: [this.data.entry?.set_time ?? ''],
    is_confirmed: [this.data.entry?.is_confirmed ?? false],
    contact_info: [this.data.entry?.contact_info ?? ''],
    notes: [this.data.entry?.notes ?? ''],
  });

  onSave(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}
