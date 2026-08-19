import { Component, input, output, computed, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { EventGuestlist, EventLineup, GuestlistSummary, GuestlistEntry, ManagedEvent } from '../../event-management.model';
import { GuestlistExportService } from '../../guestlist-export.service';
import { GuestlistCardComponent } from '../guestlist-card/guestlist-card.component';

interface FlatGuest {
  artistName: string;
  entry: GuestlistEntry;
  guestlistId: string;
}

@Component({
  selector: 'app-guestlist-panel',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressBarModule,
    GuestlistCardComponent,
  ],
  template: `
    <div class="panel-header">
      <div class="panel-info">
        <h3 class="panel-title">Guestlists</h3>
        @if (summary(); as s) {
          <span class="panel-stats">
            {{ s.totalGuestlists }} liste{{ s.totalGuestlists > 1 ? 's' : '' }}
            · {{ s.totalGuests }} personne{{ s.totalGuests > 1 ? 's' : '' }}
            @if (s.totalCheckedIn > 0) {
              · {{ s.totalCheckedIn }} check-in
            }
          </span>
        }
      </div>
      <div class="panel-actions">
        <button mat-flat-button matTooltip="Copier le lien pour la personne à l'accueil" (click)="onCopyDoorLink()">
          <mat-icon>door_front</mat-icon>
          Lien accueil
        </button>
        <button mat-flat-button [matMenuTriggerFor]="exportMenu" matTooltip="Exporter les guestlists">
          <mat-icon>download</mat-icon>
          Exporter
        </button>
        <mat-menu #exportMenu="matMenu">
          <button mat-menu-item (click)="onExportPdf()">
            <mat-icon>picture_as_pdf</mat-icon>
            <span>Export PDF</span>
          </button>
          <button mat-menu-item (click)="onExportMergedPdf()">
            <mat-icon>sort_by_alpha</mat-icon>
            <span>Export PDF regroupé (A→Z)</span>
          </button>
          <button mat-menu-item (click)="onExportExcel()">
            <mat-icon>table_chart</mat-icon>
            <span>Export Excel</span>
          </button>
          <button mat-menu-item (click)="onCopyAll()">
            <mat-icon>content_copy</mat-icon>
            <span>Copier tout</span>
          </button>
        </mat-menu>
        <button
          mat-flat-button
          color="primary"
          (click)="createGuestlist.emit()"
        >
          <mat-icon>add</mat-icon>
          Nouvelle guestlist
        </button>
        @if (notification()) {
          <span class="export-notification">{{ notification() }}</span>
        }
      </div>
    </div>

    <!-- ── Vue d'ensemble ── -->
    @if (guestlists().length > 0) {
      <div class="overview-section">
        <!-- Stats cards -->
        <div class="overview-stats">
          <div class="stat-card">
            <span class="stat-value">{{ totalPersons() }}</span>
            <span class="stat-label">Personnes</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ totalCapacity() }}</span>
            <span class="stat-label">Capacité</span>
          </div>
          <div class="stat-card">
            <span class="stat-value stat-checkin">{{ totalCheckedIn() }}</span>
            <span class="stat-label">Check-in</span>
          </div>
          <div class="stat-card">
            <span class="stat-value" [class.stat-full]="fillPercent() >= 100">{{ fillPercent() }}%</span>
            <span class="stat-label">Remplissage</span>
          </div>
        </div>

        <mat-progress-bar
          mode="determinate"
          [value]="fillPercent()"
          [color]="fillPercent() >= 100 ? 'warn' : 'primary'"
          class="overview-bar"
        />

        <!-- Filters -->
        <div class="overview-filters">
          <mat-form-field appearance="outline" class="search-field">
            <mat-icon matPrefix>search</mat-icon>
            <mat-label>Rechercher un invité</mat-label>
            <input matInput [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)" />
            @if (searchTerm()) {
              <button matSuffix mat-icon-button (click)="searchTerm.set('')">
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Filtrer par artiste</mat-label>
            <mat-select [value]="artistFilter()" (selectionChange)="artistFilter.set($event.value)">
              <mat-option value="">Tous les artistes</mat-option>
              @for (name of artistNames(); track name) {
                <mat-option [value]="name">{{ name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Consolidated guest table -->
        <div class="overview-table">
          <div class="table-header">
            <span class="th-name">Invité</span>
            <span class="th-accomp">+</span>
            <span class="th-artist">Artiste</span>
            <span class="th-status">Statut</span>
          </div>
          @if (filteredGuests().length === 0) {
            <div class="table-empty">
              @if (searchTerm() || artistFilter()) {
                Aucun résultat pour cette recherche.
              } @else {
                Aucun invité inscrit.
              }
            </div>
          } @else {
            <div class="table-body">
              @for (g of filteredGuests(); track g.entry.id) {
                <div
                  class="table-row"
                  [class.checked-in]="g.entry.is_checked_in"
                  matTooltip="Modifier l'invité"
                  (click)="editEntry.emit({ guestlistId: g.guestlistId, entry: g.entry })"
                >
                  <span class="td-name">{{ g.entry.guest_name }}</span>
                  <span class="td-accomp">
                    @if (g.entry.accompagnants > 0) {
                      <span class="accomp-badge">+{{ g.entry.accompagnants }}</span>
                    }
                  </span>
                  <span class="td-artist">{{ g.artistName }}</span>
                  <span class="td-status">
                    @if (g.entry.is_checked_in) {
                      <mat-icon class="icon-checked">check_circle</mat-icon>
                      @if (g.entry.checked_in_at) {
                        <span class="checkin-time">{{ formatCheckinTime(g.entry.checked_in_at) }}</span>
                      }
                    } @else {
                      <mat-icon class="icon-pending">radio_button_unchecked</mat-icon>
                    }
                  </span>
                </div>
              }
            </div>
            <div class="table-footer">
              {{ filteredGuests().length }} invité{{ filteredGuests().length > 1 ? 's' : '' }}
              · {{ filteredPersons() }} personne{{ filteredPersons() > 1 ? 's' : '' }} au total
            </div>
          }
        </div>
      </div>
    }

    <!-- ── Guestlists individuelles ── -->
    @if (guestlists().length === 0) {
      <div class="empty-state">
        <mat-icon class="empty-icon">list_alt</mat-icon>
        <p>Aucune guestlist créée pour cet événement.</p>
        <p class="empty-hint">Créez une guestlist pour chaque artiste ou responsable.</p>
        <button mat-flat-button color="primary" (click)="createGuestlist.emit()">
          <mat-icon>add</mat-icon>
          Créer la première guestlist
        </button>
      </div>
    } @else {
      <h4 class="section-subtitle">Par artiste</h4>
      <div class="guestlist-grid">
        @for (gl of guestlists(); track gl.id) {
          <app-guestlist-card
            [guestlist]="gl"
            (addEntry)="addEntry.emit($event)"
            (removeEntry)="removeEntry.emit($event)"
            (toggleCheckedIn)="toggleCheckedIn.emit($event)"
            (editEntry)="editEntry.emit($event)"
            (editGuestlist)="editGuestlist.emit($event)"
            (removeGuestlist)="removeGuestlist.emit($event)"
          />
        }
      </div>
    }
  `,
  styles: [`
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .panel-info {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
    }

    .panel-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .panel-stats {
      font-size: 0.85rem;
      opacity: 0.6;
    }

    .panel-actions {
      display: flex;
      gap: 0.5rem;
      position: relative;
    }

    /* ── Overview section ── */
    .overview-section {
      background: white;
      border-radius: 16px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }

    .overview-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .stat-card {
      text-align: center;
      padding: 0.75rem 0.5rem;
      background: #f8f9fa;
      border-radius: 12px;
    }

    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a1a1a;
    }

    .stat-checkin {
      color: #22c55e;
    }

    .stat-full {
      color: #ef4444;
    }

    .stat-label {
      display: block;
      font-size: 0.75rem;
      color: #888;
      margin-top: 0.15rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-weight: 500;
    }

    .overview-bar {
      margin-bottom: 1rem;
      border-radius: 4px;
    }

    .overview-filters {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .search-field {
      flex: 1;
    }

    .filter-field {
      min-width: 200px;
    }

    /* ── Table ── */
    .overview-table {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }

    .table-header {
      display: grid;
      grid-template-columns: 1fr 50px 1fr 60px;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      background: #f8f9fa;
      font-size: 0.75rem;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .table-body {
      max-height: 400px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      overscroll-behavior: contain;
    }

    .table-row {
      cursor: pointer;
      transition: background 0.15s ease;

      &:hover {
        background: rgba(111, 44, 226, 0.06);
      }

      display: grid;
      grid-template-columns: 1fr 50px 1fr 60px;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      align-items: center;
      border-bottom: 1px solid #f0f0f0;
      font-size: 0.9rem;
      transition: background 0.15s;

      &:hover {
        background: #fafafa;
      }

      &:last-child {
        border-bottom: none;
      }

      &.checked-in {
        .td-name {
          text-decoration: line-through;
          opacity: 0.5;
        }
      }
    }

    .td-name {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .td-artist {
      font-size: 0.85rem;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .td-status {
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
    }

    .checkin-time {
      font-size: 0.7rem;
      font-weight: 600;
      color: #22c55e;
      white-space: nowrap;
    }

    .accomp-badge {
      display: inline-block;
      background: #e0e7ff;
      color: #3730a3;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.1rem 0.4rem;
      border-radius: 6px;
    }

    .icon-checked {
      color: #22c55e;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .icon-pending {
      color: #ccc;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .table-empty {
      padding: 2rem;
      text-align: center;
      color: #999;
      font-size: 0.9rem;
    }

    .table-footer {
      padding: 0.5rem 1rem;
      background: #f8f9fa;
      font-size: 0.8rem;
      color: #666;
      border-top: 1px solid #e5e7eb;
    }

    /* ── Subtitle ── */
    .section-subtitle {
      font-size: 0.95rem;
      font-weight: 600;
      color: #555;
      margin: 0 0 0.75rem;
    }

    .guestlist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 1rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1rem;
      text-align: center;
      opacity: 0.7;
    }

    .empty-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      opacity: 0.4;
      margin-bottom: 1rem;
    }

    .empty-hint {
      font-size: 0.85rem;
      opacity: 0.6;
      margin-bottom: 1rem;
    }

    .export-notification {
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      white-space: nowrap;
      pointer-events: none;
      background: #dcfce7;
      color: #166534;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(22, 101, 52, 0.15);
      animation: fadeInOut 2.5s ease forwards;
    }

    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateY(-4px); }
      15% { opacity: 1; transform: translateY(0); }
      75% { opacity: 1; }
      100% { opacity: 0; }
    }

    @media (max-width: 600px) {
      .overview-stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .overview-filters {
        flex-direction: column;
      }

      .filter-field {
        min-width: 100%;
      }

      .table-header,
      .table-row {
        grid-template-columns: 1fr 40px 80px 50px;
      }

      .guestlist-grid {
        grid-template-columns: 1fr;
      }

      .panel-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestlistPanelComponent {
  private readonly exportService = inject(GuestlistExportService);

  guestlists = input<EventGuestlist[]>([]);
  lineup = input<EventLineup[]>([]);
  summary = input<GuestlistSummary | null>(null);
  event = input<ManagedEvent | null>(null);

  createGuestlist = output<void>();
  addEntry = output<EventGuestlist>();
  removeEntry = output<{ guestlistId: string; entryId: string }>();
  editEntry = output<{ guestlistId: string; entry: GuestlistEntry }>();
  toggleCheckedIn = output<{ guestlistId: string; entryId: string }>();
  editGuestlist = output<EventGuestlist>();
  removeGuestlist = output<string>();

  notification = signal('');

  // ── Overview state ──
  searchTerm = signal('');
  artistFilter = signal('');

  // All unique artist names
  artistNames = computed(() =>
    this.guestlists().map(gl => gl.artist_name).sort((a, b) => a.localeCompare(b, 'fr'))
  );

  // Flatten all entries across all guestlists
  private allGuests = computed<FlatGuest[]>(() => {
    const result: FlatGuest[] = [];
    for (const gl of this.guestlists()) {
      for (const entry of gl.entries ?? []) {
        result.push({ artistName: gl.artist_name, entry, guestlistId: gl.id });
      }
    }
    return result.sort((a, b) => a.entry.guest_name.localeCompare(b.entry.guest_name, 'fr'));
  });

  // Filtered list
  filteredGuests = computed(() => {
    let list = this.allGuests();
    const artist = this.artistFilter();
    if (artist) {
      list = list.filter(g => g.artistName === artist);
    }
    const term = this.searchTerm().toLowerCase().trim();
    if (term.length >= 1) {
      list = list.filter(g => g.entry.guest_name.toLowerCase().includes(term));
    }
    return list;
  });

  // Stats
  totalPersons = computed(() => {
    const guests = this.allGuests();
    return guests.length + guests.reduce((s, g) => s + (g.entry.accompagnants ?? 0), 0);
  });

  totalCapacity = computed(() =>
    this.guestlists().reduce((s, gl) => s + gl.quota, 0)
  );

  totalCheckedIn = computed(() =>
    this.allGuests().filter(g => g.entry.is_checked_in).length
  );

  fillPercent = computed(() => {
    const cap = this.totalCapacity();
    return cap > 0 ? Math.min(100, Math.round((this.totalPersons() / cap) * 100)) : 0;
  });

  filteredPersons = computed(() => {
    const guests = this.filteredGuests();
    return guests.length + guests.reduce((s, g) => s + (g.entry.accompagnants ?? 0), 0);
  });

  // ── Actions ──
  private showNotification(msg: string): void {
    this.notification.set(msg);
    setTimeout(() => this.notification.set(''), 2500);
  }

  formatCheckinTime(isoDate: string): string {
    return new Date(isoDate).toLocaleTimeString('fr-CH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onExportPdf(): void {
    const ev = this.event();
    if (!ev) return;
    this.exportService.exportPdf(ev, this.guestlists());
    this.showNotification('PDF téléchargé !');
  }

  onExportMergedPdf(): void {
    const ev = this.event();
    if (!ev) return;
    this.exportService.exportMergedPdf(ev, this.guestlists());
    this.showNotification('PDF regroupé téléchargé !');
  }

  async onExportExcel(): Promise<void> {
    const ev = this.event();
    if (!ev) return;
    await this.exportService.exportExcel(ev, this.guestlists());
    this.showNotification('Excel téléchargé !');
  }

  onCopyAll(): void {
    this.exportService.copyAllToClipboard(this.guestlists());
    this.showNotification('Copié !');
  }

  onCopyDoorLink(): void {
    const ev = this.event();
    if (!ev) return;
    const url = `${window.location.origin}/door/${ev.slug}`;
    navigator.clipboard.writeText(url);
    this.showNotification('Lien accueil copié !');
  }
}
