import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ArtistContract } from '../management.model';

export interface ArtistContractDialogData {
  mode: 'create' | 'edit';
  artistName: string;
  contract?: ArtistContract;
}

@Component({
  selector: 'app-artist-contract-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Nouveau contrat' : 'Modifier le contrat' }}</h2>

    <mat-dialog-content class="dialog-content">
      <h4 class="group-title">Organisateur / Client</h4>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nom de l'organisateur</mat-label>
        <input matInput [(ngModel)]="form.client_name" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Adresse</mat-label>
        <textarea matInput rows="2" [(ngModel)]="form.client_address"></textarea>
      </mat-form-field>

      <h4 class="group-title">Prestation</h4>
      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Date de l'événement</mat-label>
          <input matInput [matDatepicker]="picker" [ngModel]="eventDate" (ngModelChange)="onDateChange($event)" (click)="picker.open()" readonly required />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Horaires</mat-label>
          <input matInput [(ngModel)]="form.schedule" placeholder="23h00 – 05h00" />
        </mat-form-field>
      </div>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Lieu</mat-label>
          <input matInput [(ngModel)]="form.venue" placeholder="Le Cercle" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ville</mat-label>
          <input matInput [(ngModel)]="form.city" placeholder="Genève" />
        </mat-form-field>
      </div>

      <h4 class="group-title">Conditions financières</h4>
      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Cachet (CHF)</mat-label>
          <input matInput type="number" step="0.05" [(ngModel)]="form.fee" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Modalités de paiement</mat-label>
          <input matInput [(ngModel)]="form.payment_terms" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Clauses particulières (optionnel)</mat-label>
        <textarea matInput rows="3" [(ngModel)]="form.clauses" placeholder="Matériel à fournir, transport, hébergement..."></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!isValid()" (click)="onSave()">
        {{ data.mode === 'create' ? 'Créer le contrat' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content { display: flex; flex-direction: column; gap: 0.25rem; min-width: 540px; }
    .full-width { width: 100%; }
    .row { display: flex; gap: 1rem; }
    .row mat-form-field { flex: 1; }
    .group-title { margin: 0.5rem 0 0.5rem; font-size: 0.85rem; font-weight: 700; color: #444; text-transform: uppercase; letter-spacing: 0.04em; }
    @media (max-width: 640px) {
      .dialog-content { min-width: unset; }
      .row { flex-direction: column; gap: 0; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtistContractDialogComponent {
  readonly data = inject<ArtistContractDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ArtistContractDialogComponent>);

  form = {
    client_name: this.data.contract?.client_name ?? '',
    client_address: this.data.contract?.client_address ?? '',
    event_date: this.data.contract?.event_date ?? this.toIso(new Date()),
    venue: this.data.contract?.venue ?? '',
    city: this.data.contract?.city ?? '',
    schedule: this.data.contract?.schedule ?? '',
    fee: this.data.contract?.fee ?? null as number | null,
    payment_terms: this.data.contract?.payment_terms ?? 'Paiement intégral le soir de la prestation',
    clauses: this.data.contract?.clauses ?? '',
  };

  eventDate: Date | null = new Date(this.form.event_date + 'T00:00:00');

  onDateChange(d: Date | null): void {
    this.eventDate = d;
    this.form.event_date = d ? this.toIso(d) : '';
  }

  isValid(): boolean {
    return !!this.form.client_name.trim() && !!this.form.event_date && this.form.fee !== null && !isNaN(Number(this.form.fee));
  }

  onSave(): void {
    this.dialogRef.close({
      client_name: this.form.client_name.trim(),
      client_address: this.form.client_address.trim() || undefined,
      event_date: this.form.event_date,
      venue: this.form.venue.trim() || undefined,
      city: this.form.city.trim() || undefined,
      schedule: this.form.schedule.trim() || undefined,
      fee: Number(this.form.fee),
      payment_terms: this.form.payment_terms.trim() || 'Paiement intégral le soir de la prestation',
      clauses: this.form.clauses.trim() || undefined,
    });
  }

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
