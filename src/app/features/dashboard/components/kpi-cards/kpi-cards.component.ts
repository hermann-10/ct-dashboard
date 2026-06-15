import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { DashboardStats } from '../../dashboard.model';

@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  imports: [MatCardModule, MatIconModule, DecimalPipe],
  template: `
    <div class="kpi-grid">
      <mat-card class="kpi-card">
        <mat-icon class="kpi-icon clicks">ads_click</mat-icon>
        <div class="kpi-content">
          <span class="kpi-value">{{ stats()?.totalClicks ?? 0 }}</span>
          <span class="kpi-label">Total Clics</span>
        </div>
      </mat-card>

      <mat-card class="kpi-card">
        <mat-icon class="kpi-icon visitors">group</mat-icon>
        <div class="kpi-content">
          <span class="kpi-value">{{ stats()?.uniqueVisitors ?? 0 }}</span>
          <span class="kpi-label">Visiteurs Uniques</span>
        </div>
      </mat-card>

      <mat-card class="kpi-card">
        <mat-icon class="kpi-icon events">event</mat-icon>
        <div class="kpi-content">
          <span class="kpi-value">{{ stats()?.totalEvents ?? 0 }}</span>
          <span class="kpi-label">Événements</span>
        </div>
      </mat-card>

      <mat-card class="kpi-card">
        <mat-icon class="kpi-icon rate">percent</mat-icon>
        <div class="kpi-content">
          <span class="kpi-value">{{ (stats()?.conversionRate ?? 0) | number:'1.0-1' }}%</span>
          <span class="kpi-label">Taux Unique</span>
        </div>
      </mat-card>
    </div>
  `,
  styles: `
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .kpi-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      border: 1px solid var(--hm-border, #E5E7EB);
      border-radius: var(--hm-radius-md, 12px);
      box-shadow: var(--hm-shadow-xs, 0 1px 2px rgba(0,0,0,0.04));
      transition: box-shadow 200ms ease, transform 200ms ease;
    }
    .kpi-card:hover {
      box-shadow: var(--hm-shadow-md, 0 4px 6px rgba(0,0,0,0.07));
      transform: translateY(-1px);
    }
    .kpi-icon {
      font-size: 2.2rem;
      width: 2.2rem;
      height: 2.2rem;
      padding: 0.5rem;
      border-radius: var(--hm-radius-sm, 8px);
    }
    .kpi-icon.clicks {
      color: var(--hm-brand-primary, #6C5CE7);
      background: rgba(108, 92, 231, 0.08);
    }
    .kpi-icon.visitors {
      color: var(--hm-success, #10B981);
      background: rgba(16, 185, 129, 0.08);
    }
    .kpi-icon.events {
      color: var(--hm-warning, #F59E0B);
      background: rgba(245, 158, 11, 0.08);
    }
    .kpi-icon.rate {
      color: #EC4899;
      background: rgba(236, 72, 153, 0.08);
    }
    .kpi-content {
      display: flex;
      flex-direction: column;
    }
    .kpi-value {
      font-size: 1.75rem;
      font-weight: 800;
      line-height: 1;
      color: var(--hm-text-primary, #1E1B4B);
      letter-spacing: -0.02em;
    }
    .kpi-label {
      font-size: var(--hm-text-xs, 0.75rem);
      color: var(--hm-text-secondary, #6B7280);
      margin-top: 0.3rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 500;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardsComponent {
  stats = input<DashboardStats | null>(null);
}
