import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventManagementStore } from './event-management.store';
import { PdfExportService } from './pdf-export.service';
import { EventCharge, EventRevenue, EventLineup, EventGuestlist } from './event-management.model';
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
} from './components';
import { EventSalesPanelComponent } from '../bar/components/event-sales-panel/event-sales-panel.component';

export type EventSection = 'budget' | 'lineup' | 'guestlists' | 'bar' | 'notes';

@Component({
  selector: 'app-event-management',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
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
  private readonly pdfExport = inject(PdfExportService);

  exporting = signal(false);

  private readonly sections: EventSection[] = ['budget', 'lineup', 'guestlists', 'bar', 'notes'];
  section = signal<EventSection | null>(null);

  constructor() {
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
    const dialogRef = this.dialog.open(RevenueDialogComponent, {
      data: { mode: 'create' } as RevenueDialogData,
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

  onRemoveGuestEntry(event: { guestlistId: string; entryId: string }): void {
    this.store.removeGuestEntry(event.guestlistId, event.entryId);
  }

  onToggleGuestCheckedIn(event: { guestlistId: string; entryId: string }): void {
    this.store.toggleGuestCheckedIn(event.guestlistId, event.entryId);
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
