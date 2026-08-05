import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SupabaseService } from '../../core/services/supabase.service';
import { PrivacyService } from '../../core/services/privacy.service';
import { ContractPdfService } from '../management/contract-pdf.service';
import { InvoicePdfService } from '../event-management/invoice-pdf.service';
import { EventInvoice, InvoiceStatus, invoiceTotal } from '../event-management/invoice.model';
import { ArtistContract, ArtistInvoice, ContractStatus } from '../management/management.model';
import {
  ArtistContractDialogComponent,
  ArtistContractDialogData,
} from '../management/components/artist-contract-dialog.component';
import {
  ArtistInvoiceDialogComponent,
  ArtistInvoiceDialogData,
} from '../management/components/artist-invoice-dialog.component';

type DocSection = 'contrats' | 'factures' | 'fichiers';

interface ContractRow extends ArtistContract {
  artist?: { id: string; name: string } | null;
}

interface ArtistOption {
  id: string;
  name: string;
}

/** Facture unifiée (événement ou artiste) pour l'onglet Factures. */
interface CombinedInvoice {
  kind: 'event' | 'artist';
  id: string;
  invoice_number: number;
  client_name: string;
  issue_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  total: number;
  /** Nom de l'événement ou de l'artiste d'origine. */
  origin: string;
  eventSlug: string | null;
  raw: any;
}

interface DocumentFile {
  id: string;
  artist_id: string | null;
  label: string;
  file_path: string;
  file_type: string | null;
  size_bytes: number | null;
  created_at: string;
  artist?: { id: string; name: string } | null;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    CurrencyPipe,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly privacy = inject(PrivacyService);
  private readonly contractPdf = inject(ContractPdfService);
  private readonly invoicePdf = inject(InvoicePdfService);
  private readonly dialog = inject(MatDialog);

  readonly section = signal<DocSection>('contrats');
  readonly hideAmounts = this.privacy.hideAmounts;

  onToggleAmounts(): void {
    this.privacy.toggle();
  }

  readonly contracts = signal<ContractRow[]>([]);
  readonly invoices = signal<CombinedInvoice[]>([]);
  readonly files = signal<DocumentFile[]>([]);
  readonly filesAvailable = signal(true);
  readonly artists = signal<ArtistOption[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly uploading = signal(false);

  readonly search = signal('');
  readonly artistFilter = signal<string | null>(null);
  readonly statusFilter = signal<'all' | ContractStatus>('all');
  readonly invoiceStatusFilter = signal<'all' | InvoiceStatus>('all');
  readonly invoiceKindFilter = signal<'all' | 'event' | 'artist'>('all');

  /** Numéro d'affichage stable CNT-001… attribué par ordre de création. */
  private readonly numberById = computed(() => {
    const map = new Map<string, string>();
    [...this.contracts()]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .forEach((c, i) => map.set(c.id, 'CNT-' + String(i + 1).padStart(3, '0')));
    return map;
  });

  readonly filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const artistId = this.artistFilter();
    const status = this.statusFilter();
    return this.contracts().filter(c => {
      if (artistId && c.artist_id !== artistId) return false;
      if (status !== 'all' && c.status !== status) return false;
      if (!term) return true;
      const haystack = [
        c.client_name, c.venue, c.city, c.artist?.name,
        this.numberById().get(c.id), c.event_date,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  });

  readonly filteredInvoices = computed(() => {
    const term = this.search().toLowerCase().trim();
    const status = this.invoiceStatusFilter();
    const kind = this.invoiceKindFilter();
    return this.invoices().filter(inv => {
      if (kind !== 'all' && inv.kind !== kind) return false;
      if (status !== 'all' && inv.status !== status) return false;
      if (!term) return true;
      const haystack = [
        'N° ' + inv.invoice_number, String(inv.invoice_number),
        inv.client_name, inv.origin, inv.issue_date,
      ].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  });

  readonly filteredFiles = computed(() => {
    const term = this.search().toLowerCase().trim();
    const artistId = this.artistFilter();
    return this.files().filter(f => {
      if (artistId && f.artist_id !== artistId) return false;
      if (!term) return true;
      return [f.label, f.artist?.name, f.file_type]
        .filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  });

  readonly selectedArtist = computed(() =>
    this.artists().find(a => a.id === this.artistFilter()) ?? null
  );

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [contracts, artists, eventInvoices, artistInvoices, files] = await Promise.all([
        this.supabase.getAllArtistContracts().catch(() => []),
        this.supabase.getArtists(),
        this.supabase.getAllEventInvoices().catch(() => []),
        this.supabase.getAllArtistInvoices().catch(() => []),
        this.supabase.getArtistDocuments().catch(() => { this.filesAvailable.set(false); return []; }),
      ]);
      this.contracts.set(contracts);
      this.artists.set(artists.map((a: any) => ({ id: a.id, name: a.name })));
      this.invoices.set(this.combineInvoices(eventInvoices, artistInvoices));
      this.files.set(files);
    } catch (e: any) {
      this.error.set(e.message ?? 'Erreur de chargement');
    } finally {
      this.loading.set(false);
    }
  }

  private combineInvoices(eventInvoices: any[], artistInvoices: any[]): CombinedInvoice[] {
    const fromEvent: CombinedInvoice[] = eventInvoices.map(inv => ({
      kind: 'event',
      id: inv.id,
      invoice_number: inv.invoice_number,
      client_name: inv.client_name,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      status: inv.status,
      total: invoiceTotal(inv),
      origin: inv.event?.name ?? 'Événement',
      eventSlug: inv.event?.slug ?? null,
      raw: inv,
    }));
    const fromArtist: CombinedInvoice[] = artistInvoices.map(inv => ({
      kind: 'artist',
      id: inv.id,
      invoice_number: inv.invoice_number,
      client_name: inv.client_name,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      status: inv.status,
      total: invoiceTotal(inv),
      origin: inv.artist?.name ?? 'Artiste',
      eventSlug: null,
      raw: inv,
    }));
    return [...fromEvent, ...fromArtist].sort((a, b) => b.invoice_number - a.invoice_number);
  }

  contractNumber(c: ContractRow): string {
    return this.numberById().get(c.id) ?? '—';
  }

  // ═══ Contrats ═══

  onCreate(): void {
    const artist = this.selectedArtist();
    if (!artist) return;
    const dialogRef = this.dialog.open(ArtistContractDialogComponent, {
      data: { mode: 'create', artistName: artist.name } as ArtistContractDialogData,
      width: '620px',
    });
    dialogRef.afterClosed().subscribe(async result => {
      if (!result) return;
      try {
        const created = await this.supabase.createArtistContract({ ...result, artist_id: artist.id, status: 'draft' });
        this.contracts.update(list => [{ ...created, artist }, ...list]);
      } catch (e: any) {
        alert('Création impossible : ' + (e.message ?? 'erreur inconnue'));
      }
    });
  }

  onEdit(contract: ContractRow): void {
    const dialogRef = this.dialog.open(ArtistContractDialogComponent, {
      data: {
        mode: 'edit',
        artistName: contract.artist?.name ?? 'Artiste',
        contract,
      } as ArtistContractDialogData,
      width: '620px',
    });
    dialogRef.afterClosed().subscribe(async result => {
      if (!result) return;
      try {
        const updated = await this.supabase.updateArtistContract(contract.id, result);
        this.contracts.update(list =>
          list.map(c => (c.id === contract.id ? { ...c, ...updated, artist: c.artist } : c))
        );
      } catch (e: any) {
        alert('Mise à jour impossible : ' + (e.message ?? 'erreur inconnue'));
      }
    });
  }

  async onStatus(contract: ContractRow): Promise<void> {
    const next: ContractStatus =
      contract.status === 'draft' ? 'sent' : contract.status === 'sent' ? 'signed' : 'draft';
    try {
      const updated = await this.supabase.updateArtistContract(contract.id, { status: next });
      this.contracts.update(list =>
        list.map(c => (c.id === contract.id ? { ...c, ...updated, artist: c.artist } : c))
      );
    } catch (e: any) {
      alert('Changement de statut impossible : ' + (e.message ?? 'erreur inconnue'));
    }
  }

  async onDelete(contract: ContractRow): Promise<void> {
    const num = this.contractNumber(contract);
    if (!confirm(`Supprimer le contrat ${num} (${contract.client_name}) ?`)) return;
    try {
      await this.supabase.deleteArtistContract(contract.id);
      this.contracts.update(list => list.filter(c => c.id !== contract.id));
    } catch (e: any) {
      alert('Suppression impossible : ' + (e.message ?? 'erreur inconnue'));
    }
  }

  async onPdf(contract: ContractRow): Promise<void> {
    await this.contractPdf.exportContractPdf(contract, contract.artist?.name ?? 'Artiste');
  }

  // ═══ Factures ═══

  async onInvoiceStatus(inv: CombinedInvoice): Promise<void> {
    const next: InvoiceStatus = inv.status === 'draft' ? 'sent' : inv.status === 'sent' ? 'paid' : 'draft';
    try {
      const updated = inv.kind === 'event'
        ? await this.supabase.updateEventInvoice(inv.id, { status: next })
        : await this.supabase.updateArtistInvoice(inv.id, { status: next });
      this.invoices.update(list =>
        list.map(i => (i.id === inv.id ? { ...i, status: updated.status, raw: { ...i.raw, ...updated } } : i))
      );
    } catch (e: any) {
      alert('Changement de statut impossible : ' + (e.message ?? 'erreur inconnue'));
    }
  }

  onInvoiceEdit(inv: CombinedInvoice): void {
    if (inv.kind !== 'artist') return;
    const invoice = inv.raw as ArtistInvoice;
    const dialogRef = this.dialog.open(ArtistInvoiceDialogComponent, {
      data: {
        mode: 'edit',
        artistName: inv.origin,
        invoiceNumber: invoice.invoice_number,
        invoice,
      } as ArtistInvoiceDialogData,
      width: '640px',
    });
    dialogRef.afterClosed().subscribe(async result => {
      if (!result) return;
      try {
        const updated = await this.supabase.updateArtistInvoice(inv.id, result);
        this.invoices.update(list =>
          list.map(i => (i.id === inv.id
            ? {
                ...i,
                client_name: updated.client_name,
                issue_date: updated.issue_date,
                due_date: updated.due_date,
                total: invoiceTotal(updated),
                raw: { ...i.raw, ...updated },
              }
            : i))
        );
      } catch (e: any) {
        alert('Mise à jour impossible : ' + (e.message ?? 'erreur inconnue'));
      }
    });
  }

  async onInvoiceDelete(inv: CombinedInvoice): Promise<void> {
    if (!confirm(`Supprimer la facture n° ${inv.invoice_number} (${inv.client_name}) ?`)) return;
    try {
      if (inv.kind === 'event') {
        await this.supabase.deleteEventInvoice(inv.id);
      } else {
        await this.supabase.deleteArtistInvoice(inv.id);
      }
      this.invoices.update(list => list.filter(i => i.id !== inv.id));
    } catch (e: any) {
      alert('Suppression impossible : ' + (e.message ?? 'erreur inconnue'));
    }
  }

  async onInvoicePdf(inv: CombinedInvoice): Promise<void> {
    if (inv.kind === 'event') {
      await this.invoicePdf.exportInvoicePdf(inv.raw as EventInvoice, inv.raw.event ?? null);
    } else {
      await this.invoicePdf.exportInvoicePdf(inv.raw as unknown as EventInvoice, null, inv.origin);
    }
  }

  // ═══ Fichiers ═══

  async onFileSelected(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert('Fichier trop volumineux (20 Mo max).');
      return;
    }
    const label = prompt('Nom du document :', file.name) ?? file.name;
    const artist = this.selectedArtist();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const path = `${Date.now()}_${safeName}`;
    this.uploading.set(true);
    try {
      await this.supabase.uploadDocumentFile(path, file);
      const created = await this.supabase.createArtistDocument({
        artist_id: artist?.id ?? null,
        label: label.trim() || file.name,
        file_path: path,
        file_type: file.type || safeName.split('.').pop() || null,
        size_bytes: file.size,
      });
      this.files.update(list => [{ ...created, artist: artist ?? null }, ...list]);
    } catch (e: any) {
      alert('Upload impossible : ' + (e.message ?? 'erreur inconnue') +
        '\n\nSi la table ou le bucket n\'existent pas encore, exécute documents-fichiers-migration.sql dans Supabase.');
    } finally {
      this.uploading.set(false);
    }
  }

  async onFileDownload(f: DocumentFile): Promise<void> {
    try {
      const url = await this.supabase.getDocumentSignedUrl(f.file_path);
      window.open(url, '_blank');
    } catch (e: any) {
      alert('Téléchargement impossible : ' + (e.message ?? 'erreur inconnue'));
    }
  }

  async onFileDelete(f: DocumentFile): Promise<void> {
    if (!confirm(`Supprimer « ${f.label} » ?`)) return;
    try {
      await this.supabase.removeDocumentFile(f.file_path);
      await this.supabase.deleteArtistDocument(f.id);
      this.files.update(list => list.filter(x => x.id !== f.id));
    } catch (e: any) {
      alert('Suppression impossible : ' + (e.message ?? 'erreur inconnue'));
    }
  }

  fileIcon(f: DocumentFile): string {
    const t = (f.file_type ?? '').toLowerCase();
    if (t.includes('pdf')) return 'picture_as_pdf';
    if (t.includes('image') || /png|jpe?g|webp|gif/.test(t)) return 'image';
    if (t.includes('audio') || /mp3|wav|aiff/.test(t)) return 'audiotrack';
    if (t.includes('zip') || t.includes('rar')) return 'folder_zip';
    if (t.includes('word') || /docx?$/.test(t)) return 'description';
    if (t.includes('sheet') || /xlsx?$/.test(t)) return 'table_chart';
    return 'insert_drive_file';
  }

  fileSize(f: DocumentFile): string {
    const b = f.size_bytes ?? 0;
    if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + ' Mo';
    if (b >= 1024) return Math.round(b / 1024) + ' Ko';
    return b + ' o';
  }
}
