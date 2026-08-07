import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import type { LogisticsItem, LogisticsStatus, LogisticsCondition } from './logistics.component';

export interface LogisticsItemDialogData {
  mode: 'create' | 'edit';
  events: { id: string; name: string; date: string }[];
  item?: LogisticsItem;
}

const CATEGORIES = ['Accueil', 'Décoration', 'Technique', 'Animation', 'Bar', 'Mobilier', 'Stockage', 'Divers'];

@Component({
  selector: 'app-logistics-item-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Ajouter du matériel' : 'Modifier' }}</h2>

    <mat-dialog-content class="dialog-content">
      <div class="row">
        <mat-form-field appearance="outline" class="grow">
          <mat-label>Matériel</mat-label>
          <input matInput [(ngModel)]="form.name" required placeholder="Cables LED, Badges, Nappe noire…" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="qty-field">
          <mat-label>Qté</mat-label>
          <input matInput type="number" min="1" step="1" [(ngModel)]="form.quantity" />
        </mat-form-field>
      </div>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Catégorie</mat-label>
          <mat-select [(ngModel)]="form.category">
            @for (c of categories; track c) {
              <mat-option [value]="c">{{ c }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Statut</mat-label>
          <mat-select [(ngModel)]="form.status">
            <mat-option value="available">Disponible</mat-option>
            <mat-option value="in_use">En utilisation</mat-option>
            <mat-option value="ordered">En commande</mat-option>
            <mat-option value="unavailable">Pas dispo</mat-option>
            <mat-option value="out_of_stock">En rupture</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>État</mat-label>
          <mat-select [(ngModel)]="form.condition">
            <mat-option [value]="null">—</mat-option>
            <mat-option value="excellent">Excellent</mat-option>
            <mat-option value="bon">Bon</mat-option>
            <mat-option value="a_reparer">À réparer</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Emplacement</mat-label>
          <input matInput [(ngModel)]="form.location" placeholder="Garage, Halle, Courtrai…" />
        </mat-form-field>
      </div>

      <h4 class="group-title">Sortie sur un événement (optionnel)</h4>
      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Événement</mat-label>
          <mat-select [(ngModel)]="form.event_id" panelWidth="auto">
            <mat-option [value]="null">Aucun</mat-option>
            @for (ev of data.events; track ev.id) {
              <mat-option [value]="ev.id">{{ ev.name }} · {{ ev.date }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date de sortie</mat-label>
          <input matInput [matDatepicker]="picker" [ngModel]="outDate" (ngModelChange)="onOutDateChange($event)" (click)="picker.open()" readonly />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Notes</mat-label>
        <textarea matInput rows="2" [(ngModel)]="form.notes"></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!form.name.trim()" (click)="onSave()">
        {{ data.mode === 'create' ? 'Ajouter' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content { display: flex; flex-direction: column; gap: 0.25rem; min-width: 480px; }
    .full-width { width: 100%; }
    .row { display: flex; gap: 1rem; }
    .row mat-form-field { flex: 1; }
    .grow { flex: 2; }
    .qty-field { max-width: 100px; }
    .group-title { margin: 0.5rem 0; font-size: 0.85rem; font-weight: 700; color: #444; text-transform: uppercase; letter-spacing: 0.04em; }
    @media (max-width: 560px) {
      .dialog-content { min-width: unset; }
      .row { flex-direction: column; gap: 0.25rem; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogisticsItemDialogComponent {
  readonly data = inject<LogisticsItemDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<LogisticsItemDialogComponent>);

  readonly categories = CATEGORIES;

  form = {
    name: this.data.item?.name ?? '',
    category: this.data.item?.category ?? 'Divers',
    quantity: this.data.item?.quantity ?? 1,
    status: (this.data.item?.status ?? 'available') as LogisticsStatus,
    condition: (this.data.item?.condition ?? null) as LogisticsCondition | null,
    location: this.data.item?.location ?? '',
    event_id: this.data.item?.event_id ?? null as string | null,
    out_date: this.data.item?.out_date ?? '',
    notes: this.data.item?.notes ?? '',
  };

  outDate: Date | null = this.form.out_date ? new Date(this.form.out_date + 'T00:00:00') : null;

  onOutDateChange(d: Date | null): void {
    this.outDate = d;
    this.form.out_date = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : '';
  }

  onSave(): void {
    this.dialogRef.close({
      name: this.form.name.trim(),
      category: this.form.category,
      quantity: Math.max(1, Math.round(Number(this.form.quantity)) || 1),
      status: this.form.status,
      condition: this.form.condition,
      location: this.form.location.trim() || null,
      event_id: this.form.event_id,
      out_date: this.form.out_date || null,
      notes: this.form.notes.trim() || null,
    });
  }
}
