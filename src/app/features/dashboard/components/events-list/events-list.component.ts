import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';
import { EventConfig } from '../../dashboard.model';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule, DatePipe],
  template: `
    <div class="events-card">
      <div class="card-header">
        <span class="card-title">Événements</span>
      </div>
      @if (events().length > 0) {
        <div class="events-list">
          @for (event of events(); track event.slug) {
            <div class="event-row" (click)="viewDetail.emit(event.slug)">
              <div class="event-info">
                <span class="event-name">{{ event.name }}</span>
                <span class="event-date">{{ event.date | date:'d MMM yyyy':'':'fr-CH' }}</span>
              </div>
              <div class="event-stats">
                <div class="stat">
                  <span class="stat-value">{{ event.totalClicks }}</span>
                  <span class="stat-label">clics</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ event.uniqueVisitors }}</span>
                  <span class="stat-label">uniques</span>
                </div>
              </div>
              <span class="status-badge" [class.upcoming]="isUpcoming(event.date)">
                {{ isUpcoming(event.date) ? 'À venir' : 'Passé' }}
              </span>
              <button mat-icon-button matTooltip="Détails" class="detail-btn">
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          }
        </div>
      } @else {
        <p class="no-data">Aucun événement configuré</p>
      }
    </div>
  `,
  styles: `
    .events-card {
      background: var(--hm-surface, #fff);
      border: 1px solid var(--hm-border, #E5E7EB);
      border-radius: var(--hm-radius-md, 12px);
      padding: 1.25rem;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .card-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--hm-text-primary, #1E1B4B);
    }
    .events-list {
      display: flex;
      flex-direction: column;
    }
    .event-row {
      display: flex;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--hm-border-light, #F3F4F6);
      cursor: pointer;
      transition: background var(--hm-transition-fast, 150ms ease);
      border-radius: 4px;
      margin: 0 -0.5rem;
      padding-left: 0.5rem;
      padding-right: 0.5rem;

      &:last-child { border-bottom: none; }
      &:hover { background: var(--hm-surface-hover, #F8F7FF); }
    }
    .event-info {
      flex: 1;
      min-width: 0;
    }
    .event-name {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--hm-text-primary, #1E1B4B);
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .event-date {
      font-size: 0.6875rem;
      color: var(--hm-text-tertiary, #9CA3AF);
    }
    .event-stats {
      display: flex;
      gap: 1rem;
      margin-right: 0.75rem;
    }
    .stat {
      text-align: right;
    }
    .stat-value {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--hm-text-primary, #1E1B4B);
      display: block;
      line-height: 1;
    }
    .stat-label {
      font-size: 0.625rem;
      color: var(--hm-text-tertiary, #9CA3AF);
    }
    .status-badge {
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 99px;
      background: var(--hm-border-light, #F3F4F6);
      color: var(--hm-text-secondary, #6B7280);
      white-space: nowrap;

      &.upcoming {
        background: var(--hm-success-bg, #ECFDF5);
        color: var(--hm-success-text, #065F46);
      }
    }
    .detail-btn {
      color: var(--hm-text-tertiary, #9CA3AF);
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .no-data {
      text-align: center;
      color: var(--hm-text-tertiary, #9CA3AF);
      font-size: var(--hm-text-sm, 0.8125rem);
      padding: 2rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsListComponent {
  events = input<EventConfig[]>([]);
  viewDetail = output<string>();

  isUpcoming(date: string): boolean {
    return new Date(date) >= new Date(new Date().toISOString().split('T')[0]);
  }
}
