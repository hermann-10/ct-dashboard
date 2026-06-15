import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventManagementStore } from './event-management.store';
import { EventCharge, EventRevenue, EventLineup } from './event-management.model';
import {
  BudgetOverviewComponent,
  ChargesTableComponent,
  RevenuesTableComponent,
  LineupTableComponent,
  EventNotesComponent,
  ChargeDialogComponent, ChargeDialogData,
  RevenueDialogComponent, RevenueDialogData,
  LineupDialogComponent, LineupDialogData,
} from './components';

@Component({
  selector: 'app-event-management',
  standalone: true,
  imports: [
    RouterLink,
    MatTabsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatDialogModule, MatTooltipModule,
    BudgetOverviewComponent, ChargesTableComponent, RevenuesTableComponent,
    LineupTableComponent, EventNotesComponent,
  ],
  templateUrl: './event-management.component.html',
  styleUrl: './event-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventManagementComponent implements OnInit {
  readonly store = inject(EventManagementStore);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.store.loadEvent(slug);
    }
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
    const dialogRef = this.dialog.open(LineupDialogComponent, {
      data: { mode: 'create' } as LineupDialogData,
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
}
