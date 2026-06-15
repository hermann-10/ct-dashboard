import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { CreateContactDto } from '../../newsletter.model';

@Component({
  selector: 'app-contact-dialog',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatDialogModule, MatChipsModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Ajouter un contact</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Email *</mat-label>
        <input matInput type="email" [ngModel]="email()" (ngModelChange)="email.set($event)" />
      </mat-form-field>
      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Prénom</mat-label>
          <input matInput [ngModel]="firstName()" (ngModelChange)="firstName.set($event)" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Nom</mat-label>
          <input matInput [ngModel]="lastName()" (ngModelChange)="lastName.set($event)" />
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Tags (appuyez Entrée pour ajouter)</mat-label>
        <mat-chip-grid #chipGrid>
          @for (tag of tags(); track tag) {
            <mat-chip-row (removed)="removeTag(tag)">
              {{ tag }}
              <button matChipRemove><mat-icon>cancel</mat-icon></button>
            </mat-chip-row>
          }
        </mat-chip-grid>
        <input matInput [matChipInputFor]="chipGrid" (matChipInputTokenEnd)="addTag($event)" placeholder="Ex: vip, bâle, événement" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!email().trim()" (click)="onSave()">Ajouter</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full { width: 100%; }
    .row { display: flex; gap: 0.75rem; }
    .row mat-form-field { flex: 1; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ContactDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA);

  email = signal('');
  firstName = signal('');
  lastName = signal('');
  tags = signal<string[]>([]);

  addTag(event: MatChipInputEvent): void {
    const value = (event.value ?? '').trim().toLowerCase();
    if (value && !this.tags().includes(value)) {
      this.tags.update(t => [...t, value]);
    }
    event.chipInput.clear();
  }

  removeTag(tag: string): void {
    this.tags.update(t => t.filter(x => x !== tag));
  }

  onSave(): void {
    const dto: CreateContactDto = {
      email: this.email().trim().toLowerCase(),
      first_name: this.firstName().trim(),
      last_name: this.lastName().trim(),
      tags: this.tags(),
      source: 'manual',
    };
    this.dialogRef.close(dto);
  }
}
