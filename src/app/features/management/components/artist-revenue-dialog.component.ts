import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ArtistRevenue } from '../management.model';

export interface ArtistRevenueDialogData {
  mode: 'create' | 'edit';
  revenue?: ArtistRevenue;
  /** Établissements connus pour l'autocomplétion */
  venues?: string[];
}

@Component({
  selector: 'app-artist-revenue-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Nouvelle prestation' : 'Modifier la prestation' }}</h2>

    <mat-dialog-content class="dialog-content">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Date</mat-label>
        <input matInput [matDatepicker]="picker" [ngModel]="dateValue" (ngModelChange)="onDateChange($event)" (click)="picker.open()" readonly required />
        <mat-datepicker-toggle matIconSuffix [for]="picker" />
        <mat-datepicker #picker />
      </mat-form-field>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Établissement / Client</mat-label>
          <input
            matInput
            [ngModel]="venueTerm()"
            (ngModelChange)="venueTerm.set($event)"
            [matAutocomplete]="venueAuto"
            placeholder="Le Cercle, Moulin Rouge..."
          />
          <mat-autocomplete #venueAuto="matAutocomplete">
            @for (venue of filteredVenues(); track venue) {
              <mat-option [value]="venue">{{ venue }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Soirée / Prestation</mat-label>
          <input matInput [(ngModel)]="form.event_name" placeholder="Optionnel" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Montant (CHF)</mat-label>
        <input matInput type="number" step="0.05" [(ngModel)]="form.amount" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Notes</mat-label>
        <textarea matInput rows="2" [(ngModel)]="form.notes"></textarea>
      </mat-form-field>

      @if (data.mode === 'create') {
        <mat-slide-toggle class="invoice-toggle" [checked]="createInvoice()" (change)="createInvoice.set($event.checked)">
          Créer aussi une facture (brouillon) pour cette prestation
        </mat-slide-toggle>
        <mat-slide-toggle class="invoice-toggle" [checked]="createContract()" (change)="createContract.set($event.checked)">
          Créer aussi un contrat (brouillon) pour cette prestation
        </mat-slide-toggle>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!isValid()" (click)="onSave()">
        {{ data.mode === 'create' ? 'Ajouter' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content { display: flex; flex-direction: column; gap: 0.25rem; min-width: 440px; }
    .full-width { width: 100%; }
    .row { display: flex; gap: 1rem; }
    .row mat-form-field { flex: 1; }
    .invoice-toggle { margin: 0.25rem 0 0.5rem; font-size: 0.85rem; }
    @media (max-width: 560px) {
      .dialog-content { min-width: unset; }
      .row { flex-direction: column; gap: 0.25rem; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtistRevenueDialogComponent {
  readonly data = inject<ArtistRevenueDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ArtistRevenueDialogComponent>);

  venueTerm = signal(this.data.revenue?.venue ?? '');

  /** Création automatique d'une facture brouillon liée (mode création). */
  createInvoice = signal(true);

  /** Création automatique d'un contrat brouillon lié (mode création). */
  createContract = signal(true);

  filteredVenues = computed(() => {
    const known = this.data.venues ?? [];
    const term = this.venueTerm().toLowerCase().trim();
    const matches = term
      ? known.filter(v => v.toLowerCase().includes(term))
      : known;
    return matches.slice(0, 8);
  });

  form = {
    date: this.data.revenue?.date ?? this.toIso(new Date()),
    venue: this.data.revenue?.venue ?? '',
    event_name: this.data.revenue?.event_name ?? '',
    amount: this.data.revenue?.amount ?? null as number | null,
    notes: this.data.revenue?.notes ?? '',
  };

  dateValue: Date | null = new Date(this.form.date + 'T00:00:00');

  onDateChange(d: Date | null): void {
    this.dateValue = d;
    this.form.date = d ? this.toIso(d) : '';
  }

  isValid(): boolean {
    return !!this.form.date && this.form.amount !== null && !isNaN(Number(this.form.amount));
  }

  onSave(): void {
    this.dialogRef.close({
      date: this.form.date,
      venue: this.venueTerm().trim() || undefined,
      event_name: this.form.event_name.trim() || undefined,
      amount: Number(this.form.amount),
      notes: this.form.notes.trim() || undefined,
      createInvoice: this.data.mode === 'create' && this.createInvoice(),
      createContract: this.data.mode === 'create' && this.createContract(),
    });
  }

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
