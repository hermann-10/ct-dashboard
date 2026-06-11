import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
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
    MatDatepickerModule,
    MatNativeDateModule,
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
          <mat-label>Emoji</mat-label>
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

      <mat-slide-toggle [(ngModel)]="form.is_published">
        Publié (visible sur la page home)
      </mat-slide-toggle>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" (click)="onSave()" [disabled]="!isValid()">
        {{ data.mode === 'create' ? 'Créer' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content { display: flex; flex-direction: column; gap: 0.5rem; min-width: 480px; }
    .full-width { width: 100%; }
    .row { display: flex; gap: 1rem; }
    .row mat-form-field { flex: 1; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDialogComponent {
  readonly data = inject<EventDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<EventDialogComponent>);

  form = {
    slug: this.data.event?.slug ?? '',
    name: this.data.event?.name ?? '',
    date: this.data.event?.date ?? '',
    venue: this.data.event?.venue ?? '',
    city: this.data.event?.city ?? '',
    ticket_url: this.data.event?.ticket_url ?? '',
    image_emoji: this.data.event?.image_emoji ?? '🎉',
    is_published: this.data.event?.is_published ?? true,
  };

  isValid(): boolean {
    return !!(this.form.slug && this.form.name && this.form.date && this.form.venue && this.form.city);
  }

  onSave(): void {
    if (this.isValid()) {
      this.dialogRef.close(this.form);
    }
  }
}
