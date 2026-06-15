import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { EventGuestlist, GuestlistEntry } from '../../event-management.model';

@Component({
  selector: 'app-guestlist-card',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressBarModule,
  ],
  template: `
    <mat-card class="guestlist-card">
      <mat-card-header>
        <mat-card-title>{{ guestlist().artist_name }}</mat-card-title>
        <mat-card-subtitle>
          {{ entryCount() }} / {{ guestlist().quota }} invités
          @if (checkedInCount() > 0) {
            · {{ checkedInCount() }} check-in
          }
        </mat-card-subtitle>
        <div class="card-actions">
          <button mat-icon-button matTooltip="Copier la liste" (click)="onCopy()">
            <mat-icon>content_copy</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Modifier quota" (click)="editGuestlist.emit(guestlist())">
            <mat-icon>settings</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Supprimer la guestlist" color="warn" (click)="removeGuestlist.emit(guestlist().id)">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      </mat-card-header>

      <mat-progress-bar
        [mode]="'determinate'"
        [value]="fillPercent()"
        [color]="fillPercent() >= 100 ? 'warn' : 'primary'"
        class="quota-bar"
      />

      <mat-card-content>
        @if (entries().length === 0) {
          <p class="empty-msg">Aucun invité pour le moment.</p>
        } @else {
          <div class="guest-list">
            @for (entry of entries(); track entry.id) {
              <div class="guest-row" [class.checked-in]="entry.is_checked_in">
                <button
                  mat-icon-button
                  class="check-btn"
                  [matTooltip]="entry.is_checked_in ? 'Annuler check-in' : 'Check-in'"
                  (click)="toggleCheckedIn.emit({ guestlistId: guestlist().id, entryId: entry.id })"
                >
                  <mat-icon>{{ entry.is_checked_in ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                </button>
                <div class="guest-info">
                  <span class="guest-name">{{ entry.guest_name }}</span>
                  @if (entry.accompagnants > 0) {
                    <mat-chip class="accomp-chip">+{{ entry.accompagnants }}</mat-chip>
                  }
                  @if (entry.remarks) {
                    <span class="guest-remarks">{{ entry.remarks }}</span>
                  }
                </div>
                <button
                  mat-icon-button
                  class="delete-btn"
                  matTooltip="Supprimer"
                  (click)="removeEntry.emit({ guestlistId: guestlist().id, entryId: entry.id })"
                >
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            }
          </div>
        }
      </mat-card-content>

      <mat-card-actions>
        <button
          mat-flat-button
          color="primary"
          [disabled]="isFull()"
          (click)="addEntry.emit(guestlist())"
        >
          <mat-icon>person_add</mat-icon>
          Ajouter un invité
        </button>
        @if (isFull()) {
          <span class="full-badge">Complet</span>
        }
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .guestlist-card {
      margin-bottom: 1rem;
    }

    mat-card-header {
      display: flex;
      align-items: center;
    }

    .card-actions {
      margin-left: auto;
      display: flex;
      gap: 0;
    }

    .quota-bar {
      margin: 0.5rem 1rem 0;
    }

    .empty-msg {
      text-align: center;
      padding: 1.5rem;
      opacity: 0.5;
      font-style: italic;
    }

    .guest-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .guest-row {
      display: flex;
      align-items: center;
      padding: 0.25rem 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      transition: background 0.15s;

      &:hover {
        background: rgba(0, 0, 0, 0.02);
      }

      &.checked-in {
        .guest-name {
          text-decoration: line-through;
          opacity: 0.6;
        }
        .check-btn mat-icon {
          color: #22c55e;
        }
      }
    }

    .check-btn {
      flex-shrink: 0;
    }

    .guest-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }

    .guest-name {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .accomp-chip {
      --mdc-chip-elevated-container-color: #e0e7ff;
      --mdc-chip-label-text-color: #3730a3;
      font-size: 0.75rem;
      min-height: 24px;
    }

    .guest-remarks {
      font-size: 0.8rem;
      opacity: 0.5;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .delete-btn {
      flex-shrink: 0;
      opacity: 0.4;
      &:hover { opacity: 1; }
    }

    mat-card-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 1rem 1rem;
    }

    .full-badge {
      font-size: 0.8rem;
      color: #ef4444;
      font-weight: 600;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestlistCardComponent {
  guestlist = input.required<EventGuestlist>();

  addEntry = output<EventGuestlist>();
  removeEntry = output<{ guestlistId: string; entryId: string }>();
  toggleCheckedIn = output<{ guestlistId: string; entryId: string }>();
  editGuestlist = output<EventGuestlist>();
  removeGuestlist = output<string>();

  entries = computed(() => this.guestlist().entries ?? []);
  entryCount = computed(() => this.entries().length);
  checkedInCount = computed(() => this.entries().filter(e => e.is_checked_in).length);
  fillPercent = computed(() => {
    const q = this.guestlist().quota;
    return q > 0 ? Math.min(100, Math.round((this.entryCount() / q) * 100)) : 0;
  });
  isFull = computed(() => this.entryCount() >= this.guestlist().quota);

  onCopy(): void {
    const names = this.entries()
      .map(e => {
        let line = e.guest_name;
        if (e.accompagnants > 0) line += ` (+${e.accompagnants})`;
        if (e.remarks) line += ` — ${e.remarks}`;
        return line;
      })
      .sort((a, b) => a.localeCompare(b, 'fr'));
    const text = `${this.guestlist().artist_name} (${this.entryCount()}/${this.guestlist().quota})\n${'—'.repeat(30)}\n${names.join('\n')}`;
    navigator.clipboard.writeText(text);
  }
}
