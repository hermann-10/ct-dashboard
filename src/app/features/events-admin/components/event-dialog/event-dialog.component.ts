import { Component, inject, signal, ChangeDetectionStrategy, ElementRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { EventRecord } from '../../events-admin.model';

export interface EventDialogData {
  event?: EventRecord;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-event-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Nouvel événement' : 'Modifier l\\'événement' }}</h2>
    <mat-dialog-content class="dialog-content">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nom</mat-label>
        <input matInput [(ngModel)]="form.name" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Slug (URL)</mat-label>
        <input matInput [(ngModel)]="form.slug" required [disabled]="data.mode === 'edit'" />
      </mat-form-field>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Date</mat-label>
          <input matInput [(ngModel)]="form.date" type="date" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Emoji (fallback)</mat-label>
          <input matInput [(ngModel)]="form.image_emoji" />
        </mat-form-field>
      </div>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Lieu</mat-label>
          <input matInput [(ngModel)]="form.venue" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ville</mat-label>
          <input matInput [(ngModel)]="form.city" required />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Lien billetterie</mat-label>
        <input matInput [(ngModel)]="form.ticket_url" type="url" />
      </mat-form-field>

      <!-- Flyer upload -->
      <div class="flyer-section">
        <label class="flyer-label">Flyer / Image</label>

        @if (uploading()) {
          <mat-progress-bar mode="indeterminate" />
        }

        @if (form.image_url || previewUrl()) {
          <div class="image-preview">
            <img [src]="previewUrl() || form.image_url" alt="Aperçu du flyer" />
            <button mat-icon-button class="remove-btn" (click)="onRemoveImage()" type="button">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        } @else {
          <div class="upload-zone" (click)="fileInput.click()" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
            <mat-icon class="upload-icon">cloud_upload</mat-icon>
            <p>Glisse ton flyer ici ou clique pour choisir</p>
            <p class="upload-hint">JPG, PNG, WebP — max 5 MB</p>
          </div>
        }

        <input #fileInput type="file" accept="image/*" hidden (change)="onFileSelected($event)" />
      </div>

      @if (uploadError()) {
        <p class="upload-error">{{ uploadError() }}</p>
      }

      <mat-slide-toggle [(ngModel)]="form.is_published">
        Publié (visible sur la page home)
      </mat-slide-toggle>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" (click)="onSave()" [disabled]="!isValid() || uploading() || fetchingOg()">
        @if (fetchingOg()) {
          Récupération du flyer...
        } @else {
          {{ data.mode === 'create' ? 'Créer' : 'Enregistrer' }}
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content { display: flex; flex-direction: column; gap: 0.5rem; min-width: 480px; }
    .full-width { width: 100%; }
    .row { display: flex; gap: 1rem; }
    .row mat-form-field { flex: 1; }

    .flyer-section { margin: 0.5rem 0; }
    .flyer-label { font-size: 0.85rem; font-weight: 500; color: #555; margin-bottom: 0.5rem; display: block; }

    .upload-zone {
      border: 2px dashed #ccc;
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      &:hover { border-color: #673ab7; background: rgba(103, 58, 183, 0.04); }
      .upload-icon { font-size: 36px; width: 36px; height: 36px; color: #999; }
      p { margin: 0.25rem 0 0; color: #666; font-size: 0.9rem; }
      .upload-hint { font-size: 0.75rem; color: #999; }
    }

    .image-preview {
      position: relative;
      display: inline-block;
      img { max-width: 100%; max-height: 200px; border-radius: 12px; object-fit: cover; display: block; }
      .remove-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(0,0,0,0.6);
        color: white;
        width: 28px;
        height: 28px;
        line-height: 28px;
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
      }
    }

    .upload-error { color: #dc2626; font-size: 0.85rem; margin: 0; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDialogComponent {
  readonly data = inject<EventDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<EventDialogComponent>);
  private readonly supabase = inject(SupabaseService);

  uploading = signal(false);
  uploadError = signal('');
  previewUrl = signal('');
  fetchingOg = signal(false);
  private pendingFile: File | null = null;

  form = {
    slug: this.data.event?.slug ?? '',
    name: this.data.event?.name ?? '',
    date: this.data.event?.date ?? '',
    venue: this.data.event?.venue ?? '',
    city: this.data.event?.city ?? '',
    ticket_url: this.data.event?.ticket_url ?? '',
    image_url: this.data.event?.image_url ?? '',
    image_emoji: this.data.event?.image_emoji ?? '🎉',
    is_published: this.data.event?.is_published ?? true,
  };

  isValid(): boolean {
    return !!(this.form.slug && this.form.name && this.form.date && this.form.venue && this.form.city);
  }

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

    // Upload immediately
    this.uploadFile(file);
  }

  private async uploadFile(file: File): Promise<void> {
    this.uploading.set(true);
    try {
      const slug = this.form.slug || 'event';
      const url = await this.supabase.uploadFlyer(file, slug);
      this.form.image_url = url;
      this.pendingFile = null;
      this.uploadError.set('');
    } catch (e: any) {
      this.uploadError.set('Erreur d\'upload : ' + e.message);
      this.previewUrl.set('');
    } finally {
      this.uploading.set(false);
    }
  }

  onRemoveImage(): void {
    // Delete from storage if it was uploaded
    if (this.form.image_url && this.form.image_url.includes('event-flyers')) {
      this.supabase.deleteFlyer(this.form.image_url).catch(() => {});
    }
    this.form.image_url = '';
    this.previewUrl.set('');
    this.pendingFile = null;
  }

  async onSave(): Promise<void> {
    if (!this.isValid()) return;

    // Auto-fetch og:image if no flyer uploaded but ticket_url exists
    if (!this.form.image_url && this.form.ticket_url) {
      this.fetchingOg.set(true);
      try {
        const ogImage = await this.supabase.extractOgImage(this.form.ticket_url);
        if (ogImage) {
          this.form.image_url = ogImage;
        }
      } catch {
        // Silently fail — keep emoji fallback
      } finally {
        this.fetchingOg.set(false);
      }
    }

    this.dialogRef.close(this.form);
  }
}
