import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ARTIST_ROLES, ArtistRole } from '../../../event-management/event-management.model';
import { Artist, CreateArtistDto } from '../../artists.model';
import { SupabaseService } from '../../../../core/services/supabase.service';

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
    MatProgressSpinnerModule,
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

        <!-- Photo upload zone -->
        <div class="photo-section full-width">
          <label class="photo-label">Photo de l'artiste</label>

          @if (photoUrl() || previewUrl()) {
            <div class="image-preview">
              <img [src]="previewUrl() || photoUrl()" alt="Photo de l'artiste" />
              <button mat-icon-button class="remove-btn" (click)="onRemovePhoto()" type="button">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          } @else {
            <div
              class="upload-zone"
              (click)="fileInput.click()"
              (dragover)="onDragOver($event)"
              (drop)="onDrop($event)"
            >
              <mat-icon class="upload-icon">cloud_upload</mat-icon>
              <p>Glisse une photo ici ou clique pour choisir</p>
              <p class="upload-hint">JPG, PNG, WebP — max 5 MB</p>
            </div>
          }

          <input #fileInput type="file" accept="image/*" hidden (change)="onFileSelected($event)" />

          @if (uploadError()) {
            <p class="upload-error">{{ uploadError() }}</p>
          }
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes internes</mat-label>
          <textarea matInput rows="3" [ngModel]="notes()" (ngModelChange)="notes.set($event)"></textarea>
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!name().trim() || uploading()" (click)="onSave()">
        @if (uploading()) {
          <mat-spinner diameter="20" />
        } @else {
          {{ data.mode === 'create' ? 'Créer' : 'Enregistrer' }}
        }
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

    .photo-section {
      margin: 0.25rem 0 0.75rem;
    }

    .photo-label {
      font-size: 0.85rem;
      font-weight: 500;
      color: #555;
      margin-bottom: 0.5rem;
      display: block;
    }

    .upload-zone {
      border: 2px dashed #ccc;
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;

      &:hover {
        border-color: var(--hm-brand-primary, #6C5CE7);
        background: rgba(108, 92, 231, 0.04);
      }

      .upload-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: #999;
      }

      p {
        margin: 0.25rem 0 0;
        color: #666;
        font-size: 0.9rem;
      }

      .upload-hint {
        font-size: 0.75rem;
        color: #999;
      }
    }

    .image-preview {
      position: relative;
      display: inline-block;

      img {
        max-width: 100%;
        max-height: 200px;
        border-radius: 12px;
        object-fit: cover;
        display: block;
      }

      .remove-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        width: 28px;
        height: 28px;
        line-height: 28px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .upload-error {
      color: #dc2626;
      font-size: 0.85rem;
      margin: 0.25rem 0 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtistDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ArtistDialogComponent>);
  readonly data: DialogData = inject(MAT_DIALOG_DATA);
  private readonly supabase = inject(SupabaseService);
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
  notes = signal(this.data.artist?.notes ?? '');

  previewUrl = signal('');
  uploading = signal(false);
  uploadError = signal('');
  private pendingFile: File | null = null;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) this.handleFile(file);
  }

  private handleFile(file: File): void {
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set('Le fichier est trop lourd (max 5 MB)');
      return;
    }
    this.uploadError.set('');
    this.pendingFile = file;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  onRemovePhoto(): void {
    this.photoUrl.set('');
    this.previewUrl.set('');
    this.pendingFile = null;
    this.uploadError.set('');
  }

  async onSave(): Promise<void> {
    if (!this.name().trim() || this.uploading()) return;

    // Upload pending file to Supabase if one was selected
    if (this.pendingFile) {
      this.uploading.set(true);
      try {
        const url = await this.supabase.uploadArtistPhoto(this.pendingFile, this.name());
        this.photoUrl.set(url);
        this.pendingFile = null;
        this.uploadError.set('');
      } catch (e: any) {
        this.uploadError.set('Erreur d\'upload : ' + (e.message ?? e));
        this.uploading.set(false);
        return;
      } finally {
        this.uploading.set(false);
      }
    }

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
    };
    this.dialogRef.close(dto);
  }
}
