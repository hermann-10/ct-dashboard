import { Component, inject, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EventsAdminStore } from './events-admin.store';
import { EventDialogComponent, EventDialogData } from './components/event-dialog/event-dialog.component';
import { EventRecord } from './events-admin.model';

@Component({
  selector: 'app-events-admin',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './events-admin.component.html',
  styleUrl: './events-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsAdminComponent implements OnInit {
  readonly store = inject(EventsAdminStore);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  viewMode = signal<'list' | 'cards'>('cards');
  searchTerm = signal('');
  timeFilter = signal<'upcoming' | 'past'>('upcoming');

  upcomingCount = computed(() =>
    this.store.events().filter(e => !this.isPast(e.date)).length
  );

  pastCount = computed(() =>
    this.store.events().filter(e => this.isPast(e.date)).length
  );

  filteredEvents = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const past = this.timeFilter() === 'past';

    return this.store.events()
      .filter(e => this.isPast(e.date) === past)
      .filter(e =>
        !term ||
        e.name.toLowerCase().includes(term) ||
        e.slug.toLowerCase().includes(term) ||
        e.venue.toLowerCase().includes(term) ||
        e.city.toLowerCase().includes(term)
      )
      .sort((a, b) => (past ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  });

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

  onManage(event: EventRecord): void {
    this.router.navigate(['/admin/event', event.slug, 'manage']);
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
