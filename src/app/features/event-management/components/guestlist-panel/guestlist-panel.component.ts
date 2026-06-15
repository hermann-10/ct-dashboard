import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventGuestlist, EventLineup, GuestlistSummary } from '../../event-management.model';
import { GuestlistCardComponent } from '../guestlist-card/guestlist-card.component';

@Component({
  selector: 'app-guestlist-panel',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    GuestlistCardComponent,
  ],
  template: `
    <div class="panel-header">
      <div class="panel-info">
        <h3 class="panel-title">Guestlists</h3>
        @if (summary(); as s) {
          <span class="panel-stats">
            {{ s.totalGuestlists }} liste{{ s.totalGuestlists > 1 ? 's' : '' }}
            · {{ s.totalGuests }} invité{{ s.totalGuests > 1 ? 's' : '' }}
            @if (s.totalCheckedIn > 0) {
              · {{ s.totalCheckedIn }} check-in
            }
          </span>
        }
      </div>
      <div class="panel-actions">
        <button
          mat-flat-button
          matTooltip="Copier toutes les listes"
          (click)="onCopyAll()"
        >
          <mat-icon>content_copy</mat-icon>
          Copier tout
        </button>
        <button
          mat-flat-button
          color="primary"
          (click)="createGuestlist.emit()"
        >
          <mat-icon>add</mat-icon>
          Nouvelle guestlist
        </button>
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
  guestlists = input<EventGuestlist[]>([]);
  lineup = input<EventLineup[]>([]);
  summary = input<GuestlistSummary | null>(null);

  createGuestlist = output<void>();
  addEntry = output<EventGuestlist>();
  removeEntry = output<{ guestlistId: string; entryId: string }>();
  toggleCheckedIn = output<{ guestlistId: string; entryId: string }>();
  editGuestlist = output<EventGuestlist>();
  removeGuestlist = output<string>();

  onCopyAll(): void {
    const gls = this.guestlists();
    if (gls.length === 0) return;
    const lines = gls.map(gl => {
      const entries = (gl.entries ?? [])
        .map(e => {
          let line = `  ${e.guest_name}`;
          if (e.accompagnants > 0) line += ` (+${e.accompagnants})`;
          if (e.remarks) line += ` — ${e.remarks}`;
          return line;
        })
        .sort((a, b) => a.localeCompare(b, 'fr'));
      return `${gl.artist_name} (${(gl.entries ?? []).length}/${gl.quota})\n${entries.join('\n')}`;
    });
    navigator.clipboard.writeText(lines.join('\n\n'));
  }
}
