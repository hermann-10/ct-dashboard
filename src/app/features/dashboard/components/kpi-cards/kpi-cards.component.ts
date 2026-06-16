import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DashboardStats } from '../../dashboard.model';

@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  imports: [MatIconModule, DecimalPipe],
  template: `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Total clics</span>
          <div class="kpi-icon-wrap clicks">
            <mat-icon>ads_click</mat-icon>
          </div>
        </div>
        <div class="kpi-value">{{ stats()?.totalClicks ?? 0 }}</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Visiteurs uniques</span>
          <div class="kpi-icon-wrap visitors">
            <mat-icon>group</mat-icon>
          </div>
        </div>
        <div class="kpi-value">{{ stats()?.uniqueVisitors ?? 0 }}</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Événements</span>
          <div class="kpi-icon-wrap events">
            <mat-icon>event</mat-icon>
          </div>
        </div>
        <div class="kpi-value">{{ stats()?.totalEvents ?? 0 }}</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Taux unique</span>
          <div class="kpi-icon-wrap rate">
            <mat-icon>percent</mat-icon>
          </div>
        </div>
        <div class="kpi-value">{{ (stats()?.conversionRate ?? 0) | number:'1.0-1' }}%</div>
      </div>
    </div>
  `,
  styles: `
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .kpi-card {
      background: var(--hm-surface, #fff);
      border: 1px solid var(--hm-border, #E5E7EB);
      border-radius: var(--hm-radius-md, 12px);
      padding: 1rem 1.25rem;
      transition: box-shadow 200ms ease, transform 200ms ease;
    }
    .kpi-card:hover {
      box-shadow: var(--hm-shadow-sm, 0 1px 3px rgba(0,0,0,0.06));
      transform: translateY(-1px);
    }
    .kpi-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.625rem;
    }
    .kpi-label {
      font-size: 0.6875rem;
      color: var(--hm-text-tertiary, #9CA3AF);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .kpi-icon-wrap {
      width: 28px;
      height: 28px;
      border-radius: var(--hm-radius-sm, 8px);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }
    .kpi-icon-wrap.clicks {
      background: rgba(108, 92, 231, 0.08);
      mat-icon { color: var(--hm-brand-primary, #6C5CE7); }
    }
    .kpi-icon-wrap.visitors {
      background: rgba(16, 185, 129, 0.08);
      mat-icon { color: var(--hm-success, #10B981); }
    }
    .kpi-icon-wrap.events {
      background: rgba(245, 158, 11, 0.08);
      mat-icon { color: var(--hm-warning, #F59E0B); }
    }
    .kpi-icon-wrap.rate {
      background: rgba(236, 72, 153, 0.08);
      mat-icon { color: #EC4899; }
    }
    .kpi-value {
      font-size: 1.75rem;
      font-weight: 800;
      line-height: 1;
      color: var(--hm-text-primary, #1E1B4B);
      letter-spacing: -0.03em;
    }

    @media (max-width: 900px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 480px) {
      .kpi-grid { grid-template-columns: 1fr; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardsComponent {
  stats = input<DashboardStats | null>(null);
}
