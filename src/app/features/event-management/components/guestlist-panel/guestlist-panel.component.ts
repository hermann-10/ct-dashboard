import { Component, input, output, computed, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { EventGuestlist, EventLineup, GuestlistSummary, ManagedEvent } from '../../event-management.model';
import { GuestlistExportService } from '../../guestlist-export.service';
import { GuestlistCardComponent } from '../guestlist-card/guestlist-card.component';

@Component({
  selector: 'app-guestlist-panel',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
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
        <button mat-flat-button [matMenuTriggerFor]="exportMenu" matTooltip="Exporter les guestlists">
          <mat-icon>download</mat-icon>
          Exporter
        </button>
        <mat-menu #exportMenu="matMenu">
          <button mat-menu-item (click)="onExportPdf()">
            <mat-icon>picture_as_pdf</mat-icon>
            <span>Export PDF</span>
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
      <div class="guestlist-grid">
        @for (gl of guestlists(); track gl.id) {
          <app-guestlist-card
            [guestlist]="gl"
            (addEntry)="addEntry.emit($event)"
            (removeEntry)="removeEntry.emit($event)"
            (toggleCheckedIn)="toggleCheckedIn.emit($event)"
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
      background: #dcfce7;
      color: #166534;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 12px;
      animation: fadeInOut 2.5s ease forwards;
    }

    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateY(-4px); }
      15% { opacity: 1; transform: translateY(0); }
      75% { opacity: 1; }
      100% { opacity: 0; }
    }

    @media (max-width: 500px) {
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
  toggleCheckedIn = output<{ guestlistId: string; entryId: string }>();
  editGuestlist = output<EventGuestlist>();
  removeGuestlist = output<string>();

  notification = signal('');

  private showNotification(msg: string): void {
    this.notification.set(msg);
    setTimeout(() => this.notification.set(''), 2500);
  }

  onExportPdf(): void {
    const ev = this.event();
    if (!ev) return;
    this.exportService.exportPdf(ev, this.guestlists());
    this.showNotification('PDF téléchargé !');
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
}
