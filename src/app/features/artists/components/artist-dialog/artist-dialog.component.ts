import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ARTIST_ROLES, ArtistRole } from '../../../event-management/event-management.model';
import { Artist, CreateArtistDto } from '../../artists.model';

interface DialogData {
  mode: 'create' | 'edit';
  artist?: Artist;
}

@Component({
  selector: 'app-artist-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Nouvel artiste' : 'Modifier l\\'artiste' }}</h2>
    <mat-dialog-content>
      <div class="form-grid">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nom *</mat-label>
          <input matInput [ngModel]="name()" (ngModelChange)="name.set($event)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Genre musical</mat-label>
          <input matInput [ngModel]="genre()" (ngModelChange)="genre.set($event)" placeholder="Ex: Afro House, Techno" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Rôle</mat-label>
          <mat-select [ngModel]="role()" (ngModelChange)="role.set($event)">
            @for (r of roles; track r.value) {
              <mat-option [value]="r.value">{{ r.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" [ngModel]="email()" (ngModelChange)="email.set($event)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Téléphone</mat-label>
          <input matInput [ngModel]="phone()" (ngModelChange)="phone.set($event)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Instagram</mat-label>
          <input matInput [ngModel]="instagram()" (ngModelChange)="instagram.set($event)" placeholder="@handle" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Site web</mat-label>
          <input matInput [ngModel]="website()" (ngModelChange)="website.set($event)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ville</mat-label>
          <input matInput [ngModel]="city()" (ngModelChange)="city.set($event)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Photo URL</mat-label>
          <input matInput [ngModel]="photoUrl()" (ngModelChange)="photoUrl.set($event)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Note (0-5)</mat-label>
          <input matInput type="number" min="0" max="5" [ngModel]="rating()" (ngModelChange)="rating.set($event)" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes internes</mat-label>
          <textarea matInput rows="3" [ngModel]="notes()" (ngModelChange)="notes.set($event)"></textarea>
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!name().trim()" (click)="onSave()">
        {{ data.mode === 'create' ? 'Créer' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 0.75rem;
    }
    .full-width { grid-column: 1 / -1; }
    mat-dialog-content { max-height: 70vh; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtistDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ArtistDialogComponent>);
  readonly data: DialogData = inject(MAT_DIALOG_DATA);
  readonly roles = ARTIST_ROLES;

  name = signal(this.data.artist?.name ?? '');
  genre = signal(this.data.artist?.genre ?? '');
  role = signal<ArtistRole>(this.data.artist?.role ?? 'dj');
  email = signal(this.data.artist?.email ?? '');
  phone = signal(this.data.artist?.phone ?? '');
  instagram = signal(this.data.artist?.instagram ?? '');
  website = signal(this.data.artist?.website ?? '');
  city = signal(this.data.artist?.city ?? '');
  photoUrl = signal(this.data.artist?.photo_url ?? '');
  rating = signal(this.data.artist?.rating ?? 0);
  notes = signal(this.data.artist?.notes ?? '');

  onSave(): void {
    const dto: CreateArtistDto = {
      name: this.name().trim(),
      genre: this.genre().trim(),
      role: this.role(),
      email: this.email().trim(),
      phone: this.phone().trim(),
      instagram: this.instagram().trim(),
      website: this.website().trim(),
      city: this.city().trim(),
      photo_url: this.photoUrl().trim() || null,
      notes: this.notes().trim(),
      rating: this.rating(),
    };
    this.dialogRef.close(dto);
  }
}
