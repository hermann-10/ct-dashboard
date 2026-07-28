import { Component, inject, signal, computed, effect, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SupabaseService } from '../../core/services/supabase.service';
import { Artist } from '../artists/artists.model';
import { InvoicePdfService } from '../event-management/invoice-pdf.service';
import { EventInvoice, InvoiceStatus, invoiceTotal } from '../event-management/invoice.model';
import { ContractPdfService } from './contract-pdf.service';
import { ArtistRevenue, ArtistInvoice, ArtistContract, ContractStatus, YearSummary } from './management.model';
import { ArtistRevenueDialogComponent, ArtistRevenueDialogData } from './components/artist-revenue-dialog.component';
import { ArtistInvoiceDialogComponent, ArtistInvoiceDialogData } from './components/artist-invoice-dialog.component';
import { ArtistContractDialogComponent, ArtistContractDialogData } from './components/artist-contract-dialog.component';

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './management.component.html',
  styleUrl: './management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagementComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly dialog = inject(MatDialog);
  private readonly invoicePdf = inject(InvoicePdfService);
  private readonly contractPdf = inject(ContractPdfService);

  readonly invoiceTotal = invoiceTotal;

  artists = signal<Artist[]>([]);
  selectedArtistId = signal<string | null>(null);
  revenues = signal<ArtistRevenue[]>([]);
  invoices = signal<ArtistInvoice[]>([]);
  contracts = signal<ArtistContract[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  searchTerm = signal('');

  /** Section active : revenus / factures / contrats */
  mgmtSection = signal<'revenus' | 'factures' | 'contrats'>('revenus');

  // ── Navigation de période (section Revenus) ──
  periodMode = signal<'month' | 'year' | 'total'>('year');
  periodAnchor = signal(new Date());

  private readonly periodPrefix = computed(() => {
    if (this.periodMode() === 'total') return '';
    const d = this.periodAnchor();
    const y = d.getFullYear();
    return this.periodMode() === 'month'
      ? `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : String(y);
  });

  periodLabel = computed(() => {
    if (this.periodMode() === 'total') return 'Depuis le début';
    const d = this.periodAnchor();
    return this.periodMode() === 'month'
      ? d.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' })
      : String(d.getFullYear());
  });

  isCurrentPeriod = computed(() => {
    if (this.periodMode() === 'total') return true;
    const now = new Date();
    const p = this.periodMode() === 'month'
      ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      : String(now.getFullYear());
    return this.periodPrefix() === p;
  });

  selectedArtist = computed(() =>
    this.artists().find(a => a.id === this.selectedArtistId()) ?? null
  );

  periodRevenues = computed(() => {
    const p = this.periodPrefix();
    const term = this.searchTerm().toLowerCase().trim();
    return this.revenues()
      .filter(r => r.date.startsWith(p))
      .filter(r =>
        !term ||
        (r.venue ?? '').toLowerCase().includes(term) ||
        (r.event_name ?? '').toLowerCase().includes(term)
      );
  });

  periodStats = computed(() => {
    const rows = this.periodRevenues();
    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    return {
      total,
      count: rows.length,
      average: rows.length > 0 ? total / rows.length : 0,
    };
  });

  yearSummaries = computed<YearSummary[]>(() => {
    const byYear = new Map<number, YearSummary>();
    for (const r of this.revenues()) {
      const y = Number(r.date.slice(0, 4));
      let e = byYear.get(y);
      if (!e) {
        e = { year: y, count: 0, total: 0 };
        byYear.set(y, e);
      }
      e.count++;
      e.total += Number(r.amount);
    }
    return Array.from(byYear.values()).sort((a, b) => b.year - a.year);
  });

  maxYearTotal = computed(() =>
    Math.max(1, ...this.yearSummaries().map(y => y.total))
  );

  /** Établissements distincts de l'historique (pour l'autocomplétion) */
  knownVenues = computed(() => {
    const set = new Set<string>();
    for (const r of this.revenues()) {
      if (r.venue?.trim()) set.add(r.venue.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  });

  constructor() {
    // Recharger les données quand l'artiste change
    effect(() => {
      const id = this.selectedArtistId();
      if (id) this.loadData(id);
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const all = await this.supabase.getArtists() as Artist[];
      // Seuls les artistes managés (is_managed) apparaissent ici —
      // le reste du CRM (artistes bookés sur les événements) est exclu.
      const managed = all.filter(a => a.is_managed);
      this.artists.set(managed);
      const herzo = managed.find(a => a.name.toLowerCase().includes('herzo'));
      this.selectedArtistId.set(herzo?.id ?? managed[0]?.id ?? null);
      if (managed.length === 0) {
        this.error.set("Aucun artiste managé. Exécute managed-artists.sql dans Supabase (ou marque un artiste avec is_managed = true).");
      }
    } catch (e: any) {
      this.error.set(e.message ?? 'Erreur de chargement des artistes');
    }
  }

  private async loadData(artistId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [revenues, invoices, contracts] = await Promise.all([
        this.supabase.getArtistRevenues(artistId).catch((e: any) => {
          this.error.set(
            (e.message ?? '').includes('artist_revenues')
              ? "La table des revenus n'existe pas encore. Exécute management-migration-import.sql dans le SQL Editor de Supabase."
              : e.message ?? 'Erreur de chargement'
          );
          return [];
        }),
        this.supabase.getArtistInvoices(artistId).catch(() => []),
        this.supabase.getArtistContracts(artistId).catch(() => []),
      ]);
      this.revenues.set(revenues as ArtistRevenue[]);
      this.invoices.set(invoices as ArtistInvoice[]);
      this.contracts.set(contracts as ArtistContract[]);
    } finally {
      this.loading.set(false);
    }
  }

  shiftPeriod(delta: number): void {
    if (this.periodMode() === 'total') return;
    const d = new Date(this.periodAnchor());
    if (this.periodMode() === 'month') {
      d.setDate(1);
      d.setMonth(d.getMonth() + delta);
    } else {
      d.setFullYear(d.getFullYear() + delta);
    }
    this.periodAnchor.set(d);
  }

  resetPeriod(): void {
    this.periodAnchor.set(new Date());
  }

  goToYear(year: number): void {
    this.periodMode.set('year');
    this.periodAnchor.set(new Date(year, 0, 1));
  }

  // ── CRUD revenus ──
  onAdd(): void {
    const artistId = this.selectedArtistId();
    if (!artistId) return;
    const ref = this.dialog.open(ArtistRevenueDialogComponent, {
      data: { mode: 'create', venues: this.knownVenues() } as ArtistRevenueDialogData,
      width: '520px',
    });
    ref.afterClosed().subscribe(async result => {
      if (!result) return;
      try {
        const created = await this.supabase.createArtistRevenue({ ...result, artist_id: artistId });
        this.revenues.update(rows =>
          [created as ArtistRevenue, ...rows].sort((a, b) => b.date.localeCompare(a.date))
        );
      } catch (e: any) {
        this.error.set(e.message);
      }
    });
  }

  onEdit(revenue: ArtistRevenue): void {
    const ref = this.dialog.open(ArtistRevenueDialogComponent, {
      data: { mode: 'edit', revenue, venues: this.knownVenues() } as ArtistRevenueDialogData,
      width: '520px',
    });
    ref.afterClosed().subscribe(async result => {
      if (!result) return;
      try {
        const updated = await this.supabase.updateArtistRevenue(revenue.id, result) as ArtistRevenue;
        this.revenues.update(rows =>
          rows.map(r => (r.id === revenue.id ? updated : r)).sort((a, b) => b.date.localeCompare(a.date))
        );
      } catch (e: any) {
        this.error.set(e.message);
      }
    });
  }

  async onDelete(revenue: ArtistRevenue): Promise<void> {
    const label = revenue.venue || revenue.event_name || revenue.date;
    if (!confirm(`Supprimer la prestation « ${label} » du ${revenue.date} ?`)) return;
    try {
      await this.supabase.deleteArtistRevenue(revenue.id);
      this.revenues.update(rows => rows.filter(r => r.id !== revenue.id));
    } catch (e: any) {
      this.error.set(e.message);
    }
  }

  // ── Factures ──
  async onAddInvoice(): Promise<void> {
    const artist = this.selectedArtist();
    if (!artist) return;
    let invoiceNumber: number;
    try {
      invoiceNumber = await this.supabase.getNextArtistInvoiceNumber();
    } catch {
      alert(
        "La table des factures artiste n'existe pas encore.\n\n" +
        'Exécute management-invoices-contracts.sql dans le SQL Editor de Supabase, puis réessaie.'
      );
      return;
    }
    const ref = this.dialog.open(ArtistInvoiceDialogComponent, {
      data: { mode: 'create', artistName: artist.name, invoiceNumber } as ArtistInvoiceDialogData,
      width: '640px',
    });
    ref.afterClosed().subscribe(async result => {
      if (!result) return;
      try {
        const created = await this.supabase.createArtistInvoice({
          ...result,
          artist_id: artist.id,
          invoice_number: invoiceNumber,
        });
        this.invoices.update(rows => [created as ArtistInvoice, ...rows]);
      } catch (e: any) {
        this.error.set(e.message);
      }
    });
  }

  onEditInvoice(invoice: ArtistInvoice): void {
    const artist = this.selectedArtist();
    if (!artist) return;
    const ref = this.dialog.open(ArtistInvoiceDialogComponent, {
      data: { mode: 'edit', artistName: artist.name, invoiceNumber: invoice.invoice_number, invoice } as ArtistInvoiceDialogData,
      width: '640px',
    });
    ref.afterClosed().subscribe(async result => {
      if (!result) return;
      try {
        const updated = await this.supabase.updateArtistInvoice(invoice.id, result) as ArtistInvoice;
        this.invoices.update(rows => rows.map(i => (i.id === invoice.id ? updated : i)));
      } catch (e: any) {
        this.error.set(e.message);
      }
    });
  }

  async onInvoiceStatus(invoice: ArtistInvoice): Promise<void> {
    const next: InvoiceStatus =
      invoice.status === 'draft' ? 'sent' : invoice.status === 'sent' ? 'paid' : 'draft';
    try {
      const updated = await this.supabase.updateArtistInvoice(invoice.id, { status: next }) as ArtistInvoice;
      this.invoices.update(rows => rows.map(i => (i.id === invoice.id ? updated : i)));
    } catch (e: any) {
      this.error.set(e.message);
    }
  }

  async onDeleteInvoice(invoice: ArtistInvoice): Promise<void> {
    if (!confirm(`Supprimer la facture n° ${invoice.invoice_number} ?`)) return;
    try {
      await this.supabase.deleteArtistInvoice(invoice.id);
      this.invoices.update(rows => rows.filter(i => i.id !== invoice.id));
    } catch (e: any) {
      this.error.set(e.message);
    }
  }

  async onExportInvoice(invoice: ArtistInvoice): Promise<void> {
    const artist = this.selectedArtist();
    await this.invoicePdf.exportInvoicePdf(
      invoice as unknown as EventInvoice,
      null,
      artist?.name ?? 'Artiste'
    );
  }

  // ── Contrats ──
  onAddContract(): void {
    const artist = this.selectedArtist();
    if (!artist) return;
    const ref = this.dialog.open(ArtistContractDialogComponent, {
      data: { mode: 'create', artistName: artist.name } as ArtistContractDialogData,
      width: '640px',
    });
    ref.afterClosed().subscribe(async result => {
      if (!result) return;
      try {
        const created = await this.supabase.createArtistContract({ ...result, artist_id: artist.id });
        this.contracts.update(rows =>
          [created as ArtistContract, ...rows].sort((a, b) => b.event_date.localeCompare(a.event_date))
        );
      } catch (e: any) {
        this.error.set(
          (e.message ?? '').includes('artist_contracts')
            ? "La table des contrats n'existe pas encore. Exécute management-invoices-contracts.sql dans Supabase."
            : e.message
        );
      }
    });
  }

  onEditContract(contract: ArtistContract): void {
    const artist = this.selectedArtist();
    if (!artist) return;
    const ref = this.dialog.open(ArtistContractDialogComponent, {
      data: { mode: 'edit', artistName: artist.name, contract } as ArtistContractDialogData,
      width: '640px',
    });
    ref.afterClosed().subscribe(async result => {
      if (!result) return;
      try {
        const updated = await this.supabase.updateArtistContract(contract.id, result) as ArtistContract;
        this.contracts.update(rows =>
          rows.map(c => (c.id === contract.id ? updated : c)).sort((a, b) => b.event_date.localeCompare(a.event_date))
        );
      } catch (e: any) {
        this.error.set(e.message);
      }
    });
  }

  async onContractStatus(contract: ArtistContract): Promise<void> {
    const next: ContractStatus =
      contract.status === 'draft' ? 'sent' : contract.status === 'sent' ? 'signed' : 'draft';
    try {
      const updated = await this.supabase.updateArtistContract(contract.id, { status: next }) as ArtistContract;
      this.contracts.update(rows => rows.map(c => (c.id === contract.id ? updated : c)));
    } catch (e: any) {
      this.error.set(e.message);
    }
  }

  async onDeleteContract(contract: ArtistContract): Promise<void> {
    if (!confirm(`Supprimer le contrat « ${contract.client_name} » du ${contract.event_date} ?`)) return;
    try {
      await this.supabase.deleteArtistContract(contract.id);
      this.contracts.update(rows => rows.filter(c => c.id !== contract.id));
    } catch (e: any) {
      this.error.set(e.message);
    }
  }

  async onExportContract(contract: ArtistContract): Promise<void> {
    const artist = this.selectedArtist();
    await this.contractPdf.exportContractPdf(contract, artist?.name ?? 'Artiste');
  }

  // ── Export CSV (s'ouvre dans Excel) ──
  onExport(): void {
    const artist = this.selectedArtist();
    const rows = this.periodRevenues();
    const header = 'Date;Établissement;Soirée;Montant (CHF);Notes';
    const lines = rows.map(r =>
      [
        r.date,
        this.csv(r.venue),
        this.csv(r.event_name),
        String(r.amount).replace('.', ','),
        this.csv(r.notes),
      ].join(';')
    );
    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    lines.push(`;;;Total : ${String(total.toFixed(2)).replace('.', ',')};`);
    const csv = '﻿' + [header, ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const period = this.periodLabel().replace(/\s+/g, '_');
    a.href = url;
    a.download = `Revenus_${(artist?.name ?? 'artiste').replace(/\s+/g, '')}_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private csv(value: string | null): string {
    if (!value) return '';
    return /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }
}
