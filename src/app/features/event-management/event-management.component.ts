import { Component, inject, OnInit, ChangeDetectionStrategy, signal, computed, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventManagementStore } from './event-management.store';
import { PdfExportService } from './pdf-export.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { EventInvoice, InvoiceStatus, invoiceTotal } from './invoice.model';
import { EventCharge, EventRevenue, EventLineup, EventGuestlist, GuestlistEntry, EventStaff, staffHours, staffCost } from './event-management.model';
import {
  BudgetOverviewComponent,
  ChargesTableComponent,
  RevenuesTableComponent,
  LineupTableComponent,
  EventNotesComponent,
  GuestlistPanelComponent,
  ChargeDialogComponent, ChargeDialogData,
  RevenueDialogComponent, RevenueDialogData,
  LineupDialogComponent, LineupDialogData,
  GuestDialogComponent, GuestDialogData,
  GuestlistDialogComponent, GuestlistDialogData,
  InvoiceDialogComponent, InvoiceDialogData,
} from './components';
import { SupabaseService } from '../../core/services/supabase.service';
import { StaffDialogComponent, StaffDialogData } from './components/staff-dialog/staff-dialog.component';
import { EventSalesPanelComponent } from '../bar/components/event-sales-panel/event-sales-panel.component';

export type EventSection = 'budget' | 'lineup' | 'guestlists' | 'bar' | 'notes' | 'invoices' | 'staff';

@Component({
  selector: 'app-event-management',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatDialogModule, MatTooltipModule,
    BudgetOverviewComponent, ChargesTableComponent, RevenuesTableComponent,
    LineupTableComponent, EventNotesComponent, GuestlistPanelComponent,
    EventSalesPanelComponent,
  ],
  templateUrl: './event-management.component.html',
  styleUrl: './event-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventManagementComponent implements OnInit {
  readonly store = inject(EventManagementStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly supabase = inject(SupabaseService);

  // ── Staff / Personnel ──
  readonly staff = signal<EventStaff[]>([]);
  readonly staffAvailable = signal(true);
  private _staffLoadedFor: string | null = null;

  readonly staffStats = computed(() => {
    const rows = this.staff();
    const totalCost = Math.round(rows.reduce((sum, r) => sum + staffCost(r), 0) * 100) / 100;
    return {
      count: rows.length,
      confirmed: rows.filter(r => r.status !== 'planned').length,
      paid: rows.filter(r => r.status === 'paid').length,
      totalCost,
    };
  });
  private readonly pdfExport = inject(PdfExportService);
  private readonly invoicePdf = inject(InvoicePdfService);

  exporting = signal(false);

  private readonly sections: EventSection[] = ['budget', 'lineup', 'guestlists', 'bar', 'notes', 'invoices', 'staff'];
  section = signal<EventSection | null>(null);

  constructor() {
    // Charge le staff dès que l'événement est connu
    effect(() => {
      const ev = this.store.event();
      if (ev && this._staffLoadedFor !== ev.id) {
        this._staffLoadedFor = ev.id;
        this.loadStaff(ev.id);
      }
    });

    // Sync the active section with the URL (?tab=...) — browser back works
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe(pm => {
        const t = pm.get('tab') as EventSection | null;
        this.section.set(t && this.sections.includes(t) ? t : null);
      });
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.store.loadEvent(slug);
    }
  }

  openSection(section: EventSection): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: section },
      queryParamsHandling: 'merge',
    });
  }

  closeSection(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: null },
      queryParamsHandling: 'merge',
    });
  }

  // ── Charges ──
  onAddCharge(): void {
    const dialogRef = this.dialog.open(ChargeDialogComponent, {
      data: { mode: 'create' } as ChargeDialogData,
      width: '500px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && this.store.event()) {
        this.store.addCharge({ ...result, event_id: this.store.event()!.id });
      }
    });
  }

  onEditCharge(charge: EventCharge): void {
    const dialogRef = this.dialog.open(ChargeDialogComponent, {
      data: { mode: 'edit', charge } as ChargeDialogData,
      width: '500px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.editCharge(charge.id, result);
      }
    });
  }

  onRemoveCharge(id: string): void {
    if (confirm('Supprimer cette charge ?')) {
      this.store.removeCharge(id);
    }
  }

  onToggleChargePaid(id: string): void {
    this.store.toggleChargePaid(id);
  }

  // ── Revenues ──
  onAddRevenue(): void {
    const hasFloatLine = this.store.revenues().some(r =>
      r.label.toLowerCase().includes('fonds de caisse')
    );
    const dialogRef = this.dialog.open(RevenueDialogComponent, {
      data: { mode: 'create', suggestFloat: !hasFloatLine } as RevenueDialogData,
      width: '500px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && this.store.event()) {
        this.store.addRevenue({ ...result, event_id: this.store.event()!.id });
      }
    });
  }

  onEditRevenue(revenue: EventRevenue): void {
    const dialogRef = this.dialog.open(RevenueDialogComponent, {
      data: { mode: 'edit', revenue } as RevenueDialogData,
      width: '500px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.editRevenue(revenue.id, result);
      }
    });
  }

  onRemoveRevenue(id: string): void {
    if (confirm('Supprimer cette recette ?')) {
      this.store.removeRevenue(id);
    }
  }

  onToggleRevenueReceived(id: string): void {
    this.store.toggleRevenueReceived(id);
  }

  // ── Lineup ──
  onAddLineup(): void {
    const existingArtistNames = this.store.lineup().map(e => e.artist_name);
    const dialogRef = this.dialog.open(LineupDialogComponent, {
      data: { mode: 'create', existingArtistNames } as LineupDialogData,
      width: '500px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && this.store.event()) {
        this.store.addLineupEntry({ ...result, event_id: this.store.event()!.id });
      }
    });
  }

  onEditLineup(entry: EventLineup): void {
    const dialogRef = this.dialog.open(LineupDialogComponent, {
      data: { mode: 'edit', entry } as LineupDialogData,
      width: '500px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.editLineupEntry(entry.id, result);
      }
    });
  }

  onRemoveLineup(id: string): void {
    if (confirm('Supprimer cet artiste ?')) {
      this.store.removeLineupEntry(id);
    }
  }

  onToggleLineupConfirmed(id: string): void {
    this.store.toggleLineupConfirmed(id);
  }

  // ── Notes ──
  onSaveNotes(data: { notes: string | null; strategy: string | null }): void {
    this.store.saveNotes(data.notes, data.strategy);
  }

  // ── Guestlists ──
  onCreateGuestlist(): void {
    const dialogRef = this.dialog.open(GuestlistDialogComponent, {
      data: {
        mode: 'create',
        lineup: this.store.lineup(),
        existingArtistNames: this.store.guestlists().map(gl => gl.artist_name),
      } as GuestlistDialogData,
      width: '500px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && this.store.event()) {
        this.store.addGuestlist({ ...result, event_id: this.store.event()!.id });
      }
    });
  }

  onEditGuestlist(guestlist: EventGuestlist): void {
    const dialogRef = this.dialog.open(GuestlistDialogComponent, {
      data: {
        mode: 'edit',
        guestlist,
        lineup: this.store.lineup(),
        existingArtistNames: this.store.guestlists()
          .filter(gl => gl.id !== guestlist.id)
          .map(gl => gl.artist_name),
      } as GuestlistDialogData,
      width: '500px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.editGuestlist(guestlist.id, result);
      }
    });
  }

  onRemoveGuestlist(id: string): void {
    if (confirm('Supprimer cette guestlist et tous ses invités ?')) {
      this.store.removeGuestlist(id);
    }
  }

  onAddGuestEntry(guestlist: EventGuestlist): void {
    const entries = guestlist.entries ?? [];
    const currentCount = entries.length + entries.reduce((s, e) => s + (e.accompagnants ?? 0), 0);
    const dialogRef = this.dialog.open(GuestDialogComponent, {
      data: { mode: 'create', currentCount, quota: guestlist.quota } as GuestDialogData,
      width: '450px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.addGuestEntry(guestlist.id, { ...result, guestlist_id: guestlist.id });
      }
    });
  }

  onEditGuestEntry(event: { guestlistId: string; entry: GuestlistEntry }): void {
    const gl = this.store.guestlists().find(g => g.id === event.guestlistId);
    if (!gl) return;
    const dialogRef = this.dialog.open(GuestDialogComponent, {
      data: {
        mode: 'edit',
        entry: event.entry,
        currentCount: (gl.entries ?? []).length,
        quota: gl.quota,
      } as GuestDialogData,
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.editGuestEntry(event.guestlistId, event.entry.id, {
          guest_name: result.guest_name,
          accompagnants: result.accompagnants,
          remarks: result.remarks || null,
        });
      }
    });
  }

  onRemoveGuestEntry(event: { guestlistId: string; entryId: string }): void {
    this.store.removeGuestEntry(event.guestlistId, event.entryId);
  }

  onToggleGuestCheckedIn(event: { guestlistId: string; entryId: string }): void {
    this.store.toggleGuestCheckedIn(event.guestlistId, event.entryId);
  }

  // ── Factures ──
  readonly invoiceTotal = invoiceTotal;

  async onCreateInvoice(): Promise<void> {
    const event = this.store.event();
    if (!event) return;
    let invoiceNumber: number;
    try {
      invoiceNumber = await this.store.getNextInvoiceNumber();
    } catch {
      alert(
        "La table des factures n'existe pas encore dans Supabase.\n\n" +
        "Exécute le fichier supabase-invoices-migration.sql (à la racine du projet) " +
        "dans le SQL Editor de Supabase, puis réessaie."
      );
      return;
    }
    const dialogRef = this.dialog.open(InvoiceDialogComponent, {
      data: { mode: 'create', event, invoiceNumber } as InvoiceDialogData,
      width: '640px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.addInvoice({ ...result, event_id: event.id });
      }
    });
  }

  onEditInvoice(invoice: EventInvoice): void {
    const event = this.store.event();
    if (!event) return;
    const dialogRef = this.dialog.open(InvoiceDialogComponent, {
      data: { mode: 'edit', event, invoiceNumber: invoice.invoice_number, invoice } as InvoiceDialogData,
      width: '640px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.editInvoice(invoice.id, result);
      }
    });
  }

  onInvoiceStatus(invoice: EventInvoice, status: InvoiceStatus): void {
    this.store.setInvoiceStatus(invoice.id, status);
  }

  onRemoveInvoice(invoice: EventInvoice): void {
    if (confirm(`Supprimer la facture n° ${invoice.invoice_number} ?`)) {
      this.store.removeInvoice(invoice.id);
    }
  }

  /** Plage horaire du lineup : premier début → dernière fin. */
  readonly lineupSchedule = computed(() => {
    const slots = [...this.store.lineup()]
      .sort((x, y) => x.sort_order - y.sort_order)
      .map(l => l.set_time)
      .filter((t): t is string => !!t && /\d{1,2}:\d{2}/.test(t));
    if (slots.length === 0) return null;
    const first = slots[0].match(/(\d{1,2}:\d{2})/)?.[1];
    const lastMatches = slots[slots.length - 1].match(/(\d{1,2}:\d{2})/g);
    const last = lastMatches?.[lastMatches.length - 1];
    return first && last ? `${first} → ${last}` : null;
  });

  /** Répartit l'horaire de la soirée entre les artistes du lineup. */
  async onSuggestSlots(): Promise<void> {
    const event = this.store.event();
    const lineup = [...this.store.lineup()].sort((a, b) => a.sort_order - b.sort_order);
    if (!event || lineup.length === 0) return;
    if (!event.start_time || !event.end_time) {
      alert("Renseigne d'abord les horaires de la soirée (Début / Fin) dans le formulaire de l'événement, puis réessaie.");
      return;
    }
    const toMin = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const fmt = (min: number): string =>
      `${String(Math.floor((((min % 1440) + 1440) % 1440) / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
    const startMin = toMin(event.start_time);
    let total = toMin(event.end_time) - startMin;
    if (total <= 0) total += 1440;
    // Créneaux égaux, arrondis à 5 minutes ; le dernier absorbe le reste.
    const slot = Math.max(15, Math.round(total / lineup.length / 5) * 5);
    let cursor = startMin;
    for (let i = 0; i < lineup.length; i++) {
      const from = cursor;
      const to = i === lineup.length - 1 ? startMin + total : cursor + slot;
      await this.store.editLineupEntry(lineup[i].id, { set_time: `${fmt(from)} - ${fmt(to)}` });
      cursor = to;
    }
  }

  // ═══ Staff / Personnel ═══

  async loadStaff(eventId: string): Promise<void> {
    try {
      this.staff.set(await this.supabase.getEventStaff(eventId));
      this.staffAvailable.set(true);
    } catch {
      this.staffAvailable.set(false);
    }
  }

  staffHoursOf(row: EventStaff): number {
    return staffHours(row);
  }

  staffCostOf(row: EventStaff): number {
    return staffCost(row);
  }

  onAddStaff(): void {
    const event = this.store.event();
    if (!event) return;
    const ref = this.dialog.open(StaffDialogComponent, {
      data: { mode: 'create' } as StaffDialogData,
      width: '560px',
    });
    ref.afterClosed().subscribe(async result => {
      if (!result) return;
      const { count, dto } = result;
      try {
        const created: EventStaff[] = [];
        for (let i = 0; i < count; i++) {
          const name = dto.name || (count > 1 ? `${dto.role} ${i + 1}` : '');
          created.push(await this.supabase.createEventStaff({ ...dto, name, event_id: event.id, status: 'planned' }));
        }
        this.staff.update(rows => [...rows, ...created]);
      } catch (e: any) {
        alert(
          'Ajout impossible : ' + (e.message ?? 'erreur inconnue') +
          "\n\nSi la table n'existe pas encore, exécute event-staff-migration.sql dans Supabase."
        );
      }
    });
  }

  onEditStaff(row: EventStaff): void {
    const ref = this.dialog.open(StaffDialogComponent, {
      data: { mode: 'edit', staff: row } as StaffDialogData,
      width: '560px',
    });
    ref.afterClosed().subscribe(async result => {
      if (!result) return;
      try {
        const updated = await this.supabase.updateEventStaff(row.id, result.dto);
        this.staff.update(rows => rows.map(r => (r.id === row.id ? { ...r, ...updated } : r)));
      } catch (e: any) {
        alert('Mise à jour impossible : ' + (e.message ?? 'erreur inconnue'));
      }
    });
  }

  async onStaffStatus(row: EventStaff): Promise<void> {
    const next = row.status === 'planned' ? 'confirmed' : row.status === 'confirmed' ? 'paid' : 'planned';
    try {
      const updated = await this.supabase.updateEventStaff(row.id, { status: next });
      this.staff.update(rows => rows.map(r => (r.id === row.id ? { ...r, ...updated } : r)));
    } catch (e: any) {
      alert('Changement de statut impossible : ' + (e.message ?? 'erreur inconnue'));
    }
  }

  async onStaffCheckin(row: EventStaff): Promise<void> {
    try {
      const updated = await this.supabase.updateEventStaff(row.id, { checked_in: !row.checked_in });
      this.staff.update(rows => rows.map(r => (r.id === row.id ? { ...r, ...updated } : r)));
    } catch (e: any) {
      alert('Check-in impossible : ' + (e.message ?? 'erreur inconnue'));
    }
  }

  async onDeleteStaff(row: EventStaff): Promise<void> {
    if (!confirm(`Retirer « ${row.name || row.role} » du staff ?`)) return;
    try {
      await this.supabase.deleteEventStaff(row.id);
      this.staff.update(rows => rows.filter(r => r.id !== row.id));
    } catch (e: any) {
      alert('Suppression impossible : ' + (e.message ?? 'erreur inconnue'));
    }
  }

  /** Reporte le coût total du staff comme charge du budget. */
  onReportStaffToBudget(): void {
    const event = this.store.event();
    const total = this.staffStats().totalCost;
    if (!event || total <= 0) return;
    if (!confirm(`Ajouter une charge « Personnel / Staff » de ${total.toFixed(2)} CHF au budget ?`)) return;
    this.store.addCharge({
      event_id: event.id,
      category: 'divers',
      label: 'Personnel / Staff',
      amount: total,
      notes: `Généré depuis la section Staff (${this.staffStats().count} personnes)`,
    });
  }

  async onExportInvoice(invoice: EventInvoice): Promise<void> {
    await this.invoicePdf.exportInvoicePdf(invoice, this.store.event());
  }

  // ── PDF Export ──
  async onExportPdf(): Promise<void> {
    const event = this.store.event();
    if (!event) return;
    this.exporting.set(true);
    try {
      await this.pdfExport.exportEventPdf(
        event,
        this.store.charges(),
        this.store.revenues(),
        this.store.lineup(),
        this.store.budget(),
      );
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      this.exporting.set(false);
    }
  }
}
