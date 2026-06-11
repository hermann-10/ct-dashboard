import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventsAdminStore } from './events-admin.store';
import { EventDialogComponent, EventDialogData } from './components/event-dialog/event-dialog.component';
import { EventRecord } from './events-admin.model';

@Component({
  selector: 'app-events-admin',
  standalone: true,
  imports: [
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './events-admin.component.html',
  styleUrl: './events-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsAdminComponent implements OnInit {
  readonly store = inject(EventsAdminStore);
  private readonly dialog = inject(MatDialog);

  displayedColumns = ['emoji', 'name', 'date', 'venue', 'city', 'published', 'actions'];

  ngOnInit(): void {
    this.store.loadAll();
  }

  isPast(date: string): boolean {
    return new Date(date) < new Date(new Date().toISOString().split('T')[0]);
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(EventDialogComponent, {
      data: { mode: 'create' } as EventDialogData,
      width: '580px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.store.create(result);
    });
  }

  onEdit(event: EventRecord): void {
    const dialogRef = this.dialog.open(EventDialogComponent, {
      data: { mode: 'edit', event } as EventDialogData,
      width: '580px',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.store.update(event.id, result);
    });
  }

  onTogglePublished(event: EventRecord): void {
    this.store.togglePublished(event.id);
  }

  onDelete(event: EventRecord): void {
    if (confirm(`Supprimer "${event.name}" ?`)) {
      this.store.remove(event.id);
    }
  }

  trackingUrl(slug: string): string {
    return `https://go.hm-events.ch/go/${slug}`;
  }

  copyUrl(slug: string): void {
    navigator.clipboard.writeText(this.trackingUrl(slug));
  }

  onFetchFlyers(): void {
    this.store.fetchMissingFlyers();
  }
}
