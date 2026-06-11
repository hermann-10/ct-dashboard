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
    }
    .kpi-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      opacity: 0.9;
      &.clicks { color: #6366f1; }
      &.visitors { color: #10b981; }
      &.events { color: #f59e0b; }
      &.rate { color: #ec4899; }
    }
    .kpi-content {
      display: flex;
      flex-direction: column;
    }
    .kpi-value {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1;
    }
    .kpi-label {
      font-size: 0.8rem;
      opacity: 0.7;
      margin-top: 0.25rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardsComponent {
  stats = input<DashboardStats | null>(null);
}
