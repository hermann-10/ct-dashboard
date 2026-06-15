import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { EventLineup, EventGuestlist } from '../../event-management.model';

export interface GuestlistDialogData {
  mode: 'create' | 'edit';
  guestlist?: EventGuestlist;
  lineup: EventLineup[];
  existingArtistNames: string[];
}

@Component({
  selector: 'app-guestlist-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.mode === 'create' ? 'Nouvelle guestlist' : 'Modifier la guestlist' }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        @if (data.mode === 'create' && availableArtists.length > 0) {
          <mat-form-field appearance="outline">
            <mat-label>Artiste du lineup</mat-label>
            <mat-select (selectionChange)="onArtistSelected($event.value)">
              <mat-option value="">-- Saisie manuelle --</mat-option>
              @for (artist of availableArtists; track artist.id) {
                <mat-option [value]="artist.id">{{ artist.artist_name }}</mat-option>
              }
            </mat-select>
            <mat-hint>Sélectionnez un artiste ou saisissez un nom ci-dessous</mat-hint>
          </mat-form-field>
        }

        <mat-form-field appearance="outline">
          <mat-label>Nom du responsable</mat-label>
          <input matInput formControlName="artist_name" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Quota (max invités)</mat-label>
          <input matInput type="number" formControlName="quota" min="1" max="100" />
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
        {{ data.mode === 'create' ? 'Créer' : 'Enregistrer' }}
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
export class GuestlistDialogComponent {
  readonly data = inject<GuestlistDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<GuestlistDialogComponent>);
  private readonly fb = inject(FormBuilder);

  // Filter out artists that already have a guestlist
  readonly availableArtists = this.data.lineup.filter(
    a => !this.data.existingArtistNames.includes(a.artist_name)
  );

  private selectedLineupId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    artist_name: [this.data.guestlist?.artist_name ?? '', Validators.required],
    quota: [this.data.guestlist?.quota ?? 10, [Validators.required, Validators.min(1), Validators.max(100)]],
  });

  onArtistSelected(lineupId: string): void {
    if (!lineupId) {
      this.selectedLineupId = null;
      this.form.patchValue({ artist_name: '' });
      return;
    }
    const artist = this.data.lineup.find(a => a.id === lineupId);
    if (artist) {
      this.selectedLineupId = lineupId;
      this.form.patchValue({ artist_name: artist.artist_name });
    }
  }

  onSave(): void {
    if (this.form.invalid) return;
    const val = this.form.getRawValue();
    this.dialogRef.close({
      ...val,
      lineup_id: this.selectedLineupId ?? this.data.guestlist?.lineup_id ?? null,
    });
  }
}
