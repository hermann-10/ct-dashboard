import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ArtistInvoice } from '../management.model';

export interface ArtistInvoiceDialogData {
  mode: 'create' | 'edit';
  artistName: string;
  invoiceNumber: number;
  invoice?: ArtistInvoice;
}

interface DraftItem {
  description: string;
  amount: string;
}

@Component({
  selector: 'app-artist-invoice-dialog',
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <h2 mat-dialog-title>
      {{ data.mode === 'create' ? 'Nouvelle facture' : 'Modifier la facture' }}
      <span class="inv-number">N° {{ form.invoice_number }}</span>
    </h2>

    <mat-dialog-content class="dialog-content">
      <h4 class="group-title">Client</h4>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nom du client</mat-label>
        <input matInput [(ngModel)]="form.client_name" required />
      </mat-form-field>

      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>Adresse</mat-label>
          <textarea matInput rows="2" [(ngModel)]="form.client_address"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Téléphone</mat-label>
          <input matInput [(ngModel)]="form.client_phone" />
        </mat-form-field>
      </div>

      <h4 class="group-title">Dates & conditions</h4>
      <div class="row">
        <mat-form-field appearance="outline" class="num-field">
          <mat-label>N° de facture</mat-label>
          <input matInput type="number" min="1" step="1" [(ngModel)]="form.invoice_number" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date de facture</mat-label>
          <input matInput [matDatepicker]="issuePicker" [ngModel]="issueDate" (ngModelChange)="onIssueDateChange($event)" (click)="issuePicker.open()" readonly required />
          <mat-datepicker-toggle matIconSuffix [for]="issuePicker" />
          <mat-datepicker #issuePicker />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Échéance</mat-label>
          <input matInput [matDatepicker]="duePicker" [ngModel]="dueDate" (ngModelChange)="onDueDateChange($event)" (click)="duePicker.open()" readonly />
          <mat-datepicker-toggle matIconSuffix [for]="duePicker" />
          <mat-datepicker #duePicker />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Conditions</mat-label>
        <input matInput [(ngModel)]="form.conditions" />
      </mat-form-field>

      <h4 class="group-title">Prestations</h4>
      <p class="hint">Montant vide = ligne de détail sans montant. Montant négatif = déduction.</p>

      @for (item of items(); track $index; let i = $index) {
        <div class="item-row">
          <mat-form-field appearance="outline" class="item-desc">
            <mat-label>Description</mat-label>
            <input matInput [ngModel]="item.description" (ngModelChange)="updateItem(i, { description: $event })" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="item-amount">
            <mat-label>Montant CHF</mat-label>
            <input matInput type="number" step="0.05" [ngModel]="item.amount" (ngModelChange)="updateItem(i, { amount: $event })" />
          </mat-form-field>
          <button mat-icon-button class="item-delete" matTooltip="Supprimer la ligne" (click)="removeItem(i)" [disabled]="items().length === 1">
            <mat-icon>delete_outline</mat-icon>
          </button>
        </div>
      }

      <div class="items-actions">
        <button mat-stroked-button (click)="addItem()">
          <mat-icon>add</mat-icon>
          Ajouter une ligne
        </button>
        <span class="total">
          Solde à verser : <b>{{ total() | currency:'CHF':'symbol':'1.2-2' }}</b>
        </span>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!isValid()" (click)="onSave()">
        {{ data.mode === 'create' ? 'Créer la facture' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content { display: flex; flex-direction: column; gap: 0.25rem; min-width: 540px; }
    .inv-number { font-size: 0.85rem; font-weight: 600; color: #6C5CE7; background: rgba(108, 92, 231, 0.08); padding: 2px 10px; border-radius: 999px; margin-left: 8px; vertical-align: middle; }
    .full-width { width: 100%; }
    .row { display: flex; gap: 1rem; }
    .row mat-form-field { flex: 1; }
    .num-field { max-width: 140px; }
    .group-title { margin: 0.5rem 0 0.5rem; font-size: 0.85rem; font-weight: 700; color: #444; text-transform: uppercase; letter-spacing: 0.04em; }
    .hint { margin: 0 0 0.5rem; font-size: 0.75rem; color: #999; }
    .item-row { display: grid; grid-template-columns: 1fr 130px 40px; gap: 0.6rem; align-items: start; }
    .item-delete { margin-top: 6px; opacity: 0.4; }
    .item-delete:hover { opacity: 1; color: #dc2626; }
    .items-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem; }
    .total { font-size: 0.9rem; color: #555; }
    .total b { color: #1e1e3c; }
    @media (max-width: 640px) {
      .dialog-content { min-width: unset; }
      .row { flex-direction: column; gap: 0; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtistInvoiceDialogComponent {
  readonly data = inject<ArtistInvoiceDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ArtistInvoiceDialogComponent>);

  issueDate: Date | null;
  dueDate: Date | null;

  form = {
    invoice_number: this.data.invoice?.invoice_number ?? this.data.invoiceNumber,
    client_name: this.data.invoice?.client_name ?? '',
    client_address: this.data.invoice?.client_address ?? '',
    client_phone: this.data.invoice?.client_phone ?? '',
    issue_date: this.data.invoice?.issue_date ?? this.toIso(new Date()),
    due_date: this.data.invoice?.due_date ?? this.toIso(this.addDays(new Date(), 8)),
    conditions: this.data.invoice?.conditions ?? 'Règlement par virement bancaire',
  };

  items = signal<DraftItem[]>(
    this.data.invoice
      ? this.data.invoice.items.map(it => ({
          description: it.description,
          amount: it.amount === null || it.amount === undefined ? '' : String(it.amount),
        }))
      : [{ description: `Prestation DJ — ${this.data.artistName}`, amount: '' }]
  );

  total = computed(() =>
    this.items().reduce((s, it) => {
      const n = parseFloat(it.amount);
      return s + (isNaN(n) ? 0 : n);
    }, 0)
  );

  constructor() {
    this.issueDate = new Date(this.form.issue_date + 'T00:00:00');
    this.dueDate = this.form.due_date ? new Date(this.form.due_date + 'T00:00:00') : null;
  }

  onIssueDateChange(d: Date | null): void {
    this.issueDate = d;
    this.form.issue_date = d ? this.toIso(d) : '';
  }

  onDueDateChange(d: Date | null): void {
    this.dueDate = d;
    this.form.due_date = d ? this.toIso(d) : '';
  }

  addItem(): void {
    this.items.update(items => [...items, { description: '', amount: '' }]);
  }

  removeItem(index: number): void {
    this.items.update(items => (items.length > 1 ? items.filter((_, i) => i !== index) : items));
  }

  updateItem(index: number, patch: Partial<DraftItem>): void {
    this.items.update(items => items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  isValid(): boolean {
    return Number(this.form.invoice_number) >= 1 && !!this.form.client_name.trim() && !!this.form.issue_date && this.items().some(it => it.description.trim());
  }

  onSave(): void {
    const items = this.items()
      .filter(it => it.description.trim())
      .map(it => {
        const n = parseFloat(it.amount);
        return { description: it.description.trim(), amount: isNaN(n) ? null : n };
      });
    this.dialogRef.close({
      invoice_number: Math.max(1, Math.round(Number(this.form.invoice_number))),
      client_name: this.form.client_name.trim(),
      client_address: this.form.client_address.trim() || undefined,
      client_phone: this.form.client_phone.trim() || undefined,
      issue_date: this.form.issue_date,
      due_date: this.form.due_date || undefined,
      conditions: this.form.conditions.trim() || 'Règlement par virement bancaire',
      items,
    });
  }

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private addDays(d: Date, days: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + days);
    return r;
  }
}
