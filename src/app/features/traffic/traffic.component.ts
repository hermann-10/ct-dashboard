import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  computed,
  effect,
  ElementRef,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { DashboardStore } from '../dashboard/dashboard.store';

Chart.register(...registerables);

@Component({
  selector: 'app-traffic',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    DatePipe,
    DecimalPipe,
    TitleCasePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.loading()) {
      <div class="loading-overlay">
        <mat-spinner diameter="48" />
        <p>Chargement des donnees...</p>
      </div>
    } @else if (store.error()) {
      <div class="error-state">
        <mat-icon>error_outline</mat-icon>
        <p>{{ store.error() }}</p>
        <button mat-flat-button color="primary" (click)="onRefresh()">Reessayer</button>
      </div>
    } @else {
      <!-- Header -->
      <div class="traffic-header">
        <div class="header-left">
          <h2>Analyse du Trafic</h2>
          <p class="header-subtitle">Vue détaillée des clics et visites</p>
        </div>
        <div class="header-actions">
          <!-- Period pills -->
          <div class="period-pills">
            @for (period of periods; track period.label) {
              <button class="pill"
                      [class.active]="activePeriod() === period.label"
                      (click)="onPeriodChange(period.label, period.days)">
                {{ period.label }}
              </button>
            }
          </div>

          <!-- Event filter -->
          <div class="event-filter-wrap">
            <mat-icon class="filter-icon">filter_list</mat-icon>
            <mat-select [value]="store.selectedEventSlug()" panelWidth="auto" (selectionChange)="onEventFilter($event.value)" class="event-select" placeholder="Tous les événements">
              <mat-option [value]="null">Tous les événements</mat-option>
              @for (event of store.events(); track event.slug) {
                <mat-option [value]="event.slug">{{ event.name }}</mat-option>
              }
            </mat-select>
          </div>

          <button mat-icon-button (click)="onRefresh()" matTooltip="Actualiser" class="refresh-btn">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-wrap clicks">
            <mat-icon>ads_click</mat-icon>
          </div>
          <div class="kpi-content">
            <span class="kpi-value">{{ store.stats()?.totalClicks ?? 0 | number }}</span>
            <span class="kpi-label">Total Clics</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap visitors">
            <mat-icon>group</mat-icon>
          </div>
          <div class="kpi-content">
            <span class="kpi-value">{{ store.stats()?.uniqueVisitors ?? 0 | number }}</span>
            <span class="kpi-label">Visiteurs Uniques</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap bounce">
            <mat-icon>trending_down</mat-icon>
          </div>
          <div class="kpi-content">
            <span class="kpi-value">{{ bounceRate() | number:'1.1-1' }}%</span>
            <span class="kpi-label">Taux de Rebond</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap source">
            <mat-icon>language</mat-icon>
          </div>
          <div class="kpi-content">
            <span class="kpi-value kpi-value-sm">{{ topSource() }}</span>
            <span class="kpi-label">Source Principale</span>
          </div>
        </div>
      </div>

      <!-- Timeline chart -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">Evolution du Trafic</h3>
          <span class="section-badge">{{ store.timeline().length }} jours</span>
        </div>
        <div class="chart-container">
          <canvas #timelineCanvas></canvas>
        </div>
        @if (store.timeline().length === 0) {
          <p class="no-data">Aucune donnee disponible</p>
        }
      </div>

      <div class="two-col">
        <!-- UTM Sources table -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title">Sources de Trafic</h3>
            <span class="section-badge">{{ store.utmBreakdown().length }} sources</span>
          </div>
          @if (store.utmBreakdown().length > 0) {
            <div class="sources-list">
              @for (src of utmWithPercent(); track src.source) {
                <div class="source-row">
                  <div class="source-info">
                    <mat-icon class="source-icon">{{ getSourceIcon(src.source) }}</mat-icon>
                    <span class="source-name">{{ src.source }}</span>
                  </div>
                  <div class="source-bar-wrap">
                    <div class="source-bar" [style.width.%]="src.percent"
                         [style.background]="getSourceColor(src.source)"></div>
                  </div>
                  <div class="source-stats">
                    <span class="source-count">{{ src.count }}</span>
                    <span class="source-pct">{{ src.percent | number:'1.1-1' }}%</span>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="no-data">Aucune source identifiee</p>
          }
        </div>

        <!-- Device Breakdown -->
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title">Appareils</h3>
          </div>
          @if (store.deviceBreakdown().length > 0) {
            <div class="devices-list">
              @for (dev of devicesWithPercent(); track dev.device) {
                <div class="device-row">
                  <div class="device-info">
                    <mat-icon>{{ getDeviceIcon(dev.device) }}</mat-icon>
                    <span class="device-name">{{ dev.device | titlecase }}</span>
                  </div>
                  <div class="device-bar-area">
                    <div class="device-bar"
                         [style.width.%]="dev.percent"
                         [style.background]="getDeviceColor(dev.device)">
                    </div>
                  </div>
                  <div class="device-stats">
                    <span class="device-count">{{ dev.count }}</span>
                    <span class="device-pct">{{ dev.percent | number:'1.0-1' }}%</span>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="no-data">Aucune donnee</p>
          }
        </div>
      </div>

      <!-- Recent Clicks Table -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">Clics Recents</h3>
          <span class="section-badge">{{ Math.min(20, store.recentClicks().length) }} derniers</span>
        </div>
        @if (store.recentClicks().length > 0) {
          <div class="table-scroll">
            <table class="hm-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Evenement</th>
                  <th>Appareil</th>
                  <th>Source</th>
                  <th>Referrer</th>
                </tr>
              </thead>
              <tbody>
                @for (click of store.recentClicks().slice(0, 20); track click.id) {
                  <tr>
                    <td class="cell-date">{{ click.created_at | date:'dd/MM/yy HH:mm' }}</td>
                    <td>
                      <span class="event-badge">{{ click.event_name }}</span>
                    </td>
                    <td>
                      <div class="cell-device">
                        <mat-icon class="cell-icon">{{ getDeviceIcon(click.device) }}</mat-icon>
                        {{ click.device }}
                      </div>
                    </td>
                    <td>{{ click.utm_source || 'direct' }}</td>
                    <td class="cell-referrer">{{ truncateReferrer(click.referrer) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="no-data">Aucun clic enregistre</p>
        }
      </div>

      <!-- Top Referrers -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">Top Referrers</h3>
        </div>
        @if (topReferrers().length > 0) {
          <div class="referrers-list">
            @for (ref of topReferrers(); track ref.referrer; let i = $index) {
              <div class="referrer-row">
                <span class="referrer-rank">{{ i + 1 }}</span>
                <span class="referrer-name">{{ ref.referrer }}</span>
                <div class="referrer-bar-wrap">
                  <div class="referrer-bar"
                       [style.width.%]="(ref.count / (topReferrers()[0]?.count || 1)) * 100">
                  </div>
                </div>
                <span class="referrer-count">{{ ref.count }}</span>
              </div>
            }
          </div>
        } @else {
          <p class="no-data">Aucun referrer identifie</p>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    /* ── Loading / Error ── */
    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      gap: 1rem;
      opacity: 0.7;
      color: var(--hm-text-secondary);
      font-size: var(--hm-text-sm);
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4rem;
      gap: 1rem;
      color: var(--hm-text-secondary);

      mat-icon {
        font-size: 3rem;
        width: 3rem;
        height: 3rem;
        color: var(--hm-error);
      }
    }

    /* ── Header ── */
    .traffic-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .header-left h2 {
      margin: 0;
      font-size: var(--hm-text-2xl);
      font-weight: 700;
      color: var(--hm-text-primary);
      letter-spacing: -0.02em;
    }

    .header-subtitle {
      margin: 0.25rem 0 0;
      font-size: var(--hm-text-sm);
      color: var(--hm-text-secondary);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    /* ── Period pills ── */
    .period-pills {
      display: flex;
      background: var(--hm-border-light);
      border-radius: var(--hm-radius-full);
      padding: 3px;
      gap: 2px;
    }

    .pill {
      border: none;
      background: transparent;
      padding: 0.3rem 0.875rem;
      border-radius: var(--hm-radius-full);
      font-family: var(--hm-font-sans);
      font-size: var(--hm-text-xs);
      font-weight: 500;
      color: var(--hm-text-secondary);
      cursor: pointer;
      transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      line-height: 1.4;

      &:hover:not(.active) {
        color: var(--hm-text-primary);
        background: rgba(255, 255, 255, 0.6);
      }

      &.active {
        background: var(--hm-brand-primary);
        color: var(--hm-text-inverse);
        box-shadow: 0 1px 3px rgba(108, 92, 231, 0.3);
      }
    }

    /* ── Event filter ── */
    .event-filter-wrap {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      background: var(--hm-surface);
      border: 1px solid var(--hm-border);
      border-radius: var(--hm-radius-sm);
      padding: 0 0.75rem;
      height: 34px;
      min-width: 200px;
      max-width: 280px;
      cursor: pointer;
      transition: border-color 150ms ease, box-shadow 150ms ease;

      &:hover {
        border-color: var(--hm-brand-primary-light);
      }

      &:focus-within {
        border-color: var(--hm-brand-primary);
        box-shadow: var(--hm-shadow-glow);
      }
    }

    .filter-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      color: var(--hm-text-tertiary);
      flex-shrink: 0;
    }

    .event-select {
      flex: 1;
      min-width: 0;

      ::ng-deep {
        .mat-mdc-select-trigger {
          height: 32px;
        }
        .mat-mdc-select-value {
          font-size: var(--hm-text-sm);
          color: var(--hm-text-primary);
        }
        .mat-mdc-select-placeholder {
          font-size: var(--hm-text-sm);
          color: var(--hm-text-tertiary);
        }
        .mat-mdc-select-arrow-wrapper .mat-mdc-select-arrow {
          color: var(--hm-text-tertiary);
        }
        .mat-mdc-select-panel {
          min-width: 320px;
          border-radius: var(--hm-radius-sm) !important;
          box-shadow: var(--hm-shadow-lg) !important;
        }
        .mat-mdc-option {
          font-size: var(--hm-text-sm);
          min-height: 40px;

          .mdc-list-item__primary-text {
            white-space: normal;
            line-height: 1.3;
          }
        }
      }
    }

    /* ── Refresh button ── */
    .refresh-btn {
      color: var(--hm-text-tertiary);
      width: 34px;
      height: 34px;
      border: 1px solid var(--hm-border);
      border-radius: var(--hm-radius-sm);
      background: var(--hm-surface);
      transition: all 150ms ease;

      &:hover {
        color: var(--hm-brand-primary);
        border-color: var(--hm-brand-primary-light);
        background: var(--hm-surface-hover);
      }

      mat-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
      }
    }

    /* ── KPI Grid ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .kpi-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      background: var(--hm-surface);
      border: 1px solid var(--hm-border);
      border-radius: var(--hm-radius-md);
      box-shadow: var(--hm-shadow-xs);
      transition: box-shadow 200ms ease, transform 200ms ease;
    }

    .kpi-card:hover {
      box-shadow: var(--hm-shadow-md);
      transform: translateY(-1px);
    }

    .kpi-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--hm-radius-sm);

      mat-icon {
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
      }
    }

    .kpi-icon-wrap.clicks {
      color: var(--hm-brand-primary);
      background: rgba(108, 92, 231, 0.08);
    }

    .kpi-icon-wrap.visitors {
      color: var(--hm-success);
      background: rgba(16, 185, 129, 0.08);
    }

    .kpi-icon-wrap.bounce {
      color: var(--hm-error);
      background: rgba(239, 68, 68, 0.08);
    }

    .kpi-icon-wrap.source {
      color: var(--hm-info);
      background: rgba(59, 130, 246, 0.08);
    }

    .kpi-content {
      display: flex;
      flex-direction: column;
    }

    .kpi-value {
      font-size: 1.75rem;
      font-weight: 800;
      line-height: 1;
      color: var(--hm-text-primary);
      letter-spacing: -0.02em;
    }

    .kpi-value-sm {
      font-size: 1.125rem;
      font-weight: 700;
    }

    .kpi-label {
      font-size: var(--hm-text-xs);
      color: var(--hm-text-secondary);
      margin-top: 0.3rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 500;
    }

    /* ── Section Cards ── */
    .section-card {
      background: var(--hm-surface);
      border: 1px solid var(--hm-border);
      border-radius: var(--hm-radius-md);
      box-shadow: var(--hm-shadow-xs);
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.25rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .section-title {
      margin: 0;
      font-size: var(--hm-text-lg);
      font-weight: 700;
      color: var(--hm-text-primary);
      letter-spacing: -0.01em;
    }

    .section-badge {
      font-size: var(--hm-text-xs);
      font-weight: 600;
      padding: 3px 10px;
      border-radius: var(--hm-radius-full);
      background: rgba(108, 92, 231, 0.1);
      color: var(--hm-brand-primary);
    }

    /* ── Chart ── */
    .chart-container {
      position: relative;
      height: 300px;
    }

    .no-data {
      text-align: center;
      opacity: 0.5;
      padding: 2rem;
      font-size: var(--hm-text-sm);
    }

    /* ── Two Column Layout ── */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      margin-bottom: 0;
    }

    /* ── Sources List ── */
    .sources-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .source-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .source-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 120px;
    }

    .source-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: var(--hm-text-tertiary);
    }

    .source-name {
      font-size: var(--hm-text-sm);
      font-weight: 500;
      color: var(--hm-text-primary);
    }

    .source-bar-wrap {
      flex: 1;
      height: 8px;
      background: var(--hm-border-light);
      border-radius: 4px;
      overflow: hidden;
    }

    .source-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 400ms ease;
    }

    .source-stats {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 80px;
      justify-content: flex-end;
    }

    .source-count {
      font-size: var(--hm-text-sm);
      font-weight: 700;
      color: var(--hm-text-primary);
    }

    .source-pct {
      font-size: var(--hm-text-xs);
      color: var(--hm-text-tertiary);
      min-width: 40px;
      text-align: right;
    }

    /* ── Devices ── */
    .devices-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .device-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .device-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 110px;

      mat-icon {
        font-size: 1.2rem;
        width: 1.2rem;
        height: 1.2rem;
        color: var(--hm-text-tertiary);
      }
    }

    .device-name {
      font-size: var(--hm-text-sm);
      font-weight: 500;
      color: var(--hm-text-primary);
    }

    .device-bar-area {
      flex: 1;
      height: 24px;
      background: var(--hm-border-light);
      border-radius: 6px;
      overflow: hidden;
    }

    .device-bar {
      height: 100%;
      border-radius: 6px;
      transition: width 400ms ease;
      min-width: 4px;
    }

    .device-stats {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 80px;
      justify-content: flex-end;
    }

    .device-count {
      font-size: var(--hm-text-sm);
      font-weight: 700;
      color: var(--hm-text-primary);
    }

    .device-pct {
      font-size: var(--hm-text-xs);
      color: var(--hm-text-tertiary);
    }

    /* ── Recent Clicks Table ── */
    .table-scroll {
      overflow-x: auto;
    }

    .hm-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--hm-text-sm);
    }

    .hm-table th,
    .hm-table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--hm-border-light);
    }

    .hm-table th {
      font-weight: 600;
      font-size: var(--hm-text-xs);
      color: var(--hm-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--hm-bg);
    }

    .hm-table tbody tr {
      transition: background 150ms ease;
    }

    .hm-table tbody tr:hover {
      background: var(--hm-surface-hover);
    }

    .hm-table tbody tr:last-child td {
      border-bottom: none;
    }

    .cell-date {
      white-space: nowrap;
      font-size: var(--hm-text-xs);
      color: var(--hm-text-secondary);
      font-variant-numeric: tabular-nums;
    }

    .cell-device {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .cell-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--hm-text-tertiary);
    }

    .cell-referrer {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--hm-text-xs);
      color: var(--hm-text-tertiary);
    }

    .event-badge {
      display: inline-block;
      font-size: var(--hm-text-xs);
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--hm-radius-full);
      background: rgba(108, 92, 231, 0.08);
      color: var(--hm-brand-primary);
    }

    /* ── Referrers ── */
    .referrers-list {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .referrer-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .referrer-rank {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--hm-text-xs);
      font-weight: 700;
      color: var(--hm-text-tertiary);
      background: var(--hm-border-light);
      border-radius: var(--hm-radius-full);
      flex-shrink: 0;
    }

    .referrer-name {
      font-size: var(--hm-text-sm);
      font-weight: 500;
      color: var(--hm-text-primary);
      min-width: 140px;
    }

    .referrer-bar-wrap {
      flex: 1;
      height: 6px;
      background: var(--hm-border-light);
      border-radius: 3px;
      overflow: hidden;
    }

    .referrer-bar {
      height: 100%;
      border-radius: 3px;
      background: var(--hm-brand-primary-light);
      transition: width 400ms ease;
    }

    .referrer-count {
      font-size: var(--hm-text-sm);
      font-weight: 700;
      color: var(--hm-text-primary);
      min-width: 32px;
      text-align: right;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      :host {
        padding: 1rem;
      }

      .traffic-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .header-actions {
        flex-wrap: wrap;
        width: 100%;
      }

      .event-filter-wrap {
        flex: 1;
        max-width: none;
      }

      .two-col {
        grid-template-columns: 1fr;
      }

      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .source-info {
        min-width: 80px;
      }

      .device-info {
        min-width: 80px;
      }

      .referrer-name {
        min-width: 80px;
      }
    }

    @media (max-width: 480px) {
      .kpi-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class TrafficComponent implements OnInit, OnDestroy {
  readonly store = inject(DashboardStore);
  readonly Math = Math;

  private timelineCanvas = viewChild<ElementRef<HTMLCanvasElement>>('timelineCanvas');
  private chart: Chart | null = null;

  readonly periods = [
    { label: '7j', days: 7 },
    { label: '30j', days: 30 },
    { label: '90j', days: 90 },
    { label: 'Tout', days: 0 },
  ];

  activePeriod = signal('Tout');

  // Computed: bounce rate = 100 - conversionRate
  bounceRate = computed(() => {
    const stats = this.store.stats();
    if (!stats) return 0;
    return Math.max(0, 100 - stats.conversionRate);
  });

  // Computed: top UTM source
  topSource = computed(() => {
    const utm = this.store.utmBreakdown();
    if (utm.length === 0) return 'N/A';
    const top = utm.reduce((a, b) => (a.count > b.count ? a : b));
    return top.source || 'direct';
  });

  // Computed: UTM breakdown with percentages
  utmWithPercent = computed(() => {
    const sources = this.store.utmBreakdown();
    const total = sources.reduce((s, r) => s + r.count, 0);
    return sources.map(s => ({
      source: s.source,
      count: s.count,
      percent: total > 0 ? (s.count / total) * 100 : 0,
    }));
  });

  // Computed: devices with percentages
  devicesWithPercent = computed(() => {
    const devices = this.store.deviceBreakdown();
    const total = devices.reduce((s, d) => s + d.count, 0);
    return devices.map(d => ({
      device: d.device,
      count: d.count,
      percent: total > 0 ? (d.count / total) * 100 : 0,
    }));
  });

  // Computed: top referrers from recentClicks
  topReferrers = computed(() => {
    const clicks = this.store.recentClicks();
    const refMap = new Map<string, number>();
    clicks.forEach(c => {
      if (!c.referrer) {
        refMap.set('direct', (refMap.get('direct') || 0) + 1);
        return;
      }
      try {
        const hostname = new URL(c.referrer).hostname;
        refMap.set(hostname, (refMap.get(hostname) || 0) + 1);
      } catch {
        refMap.set(c.referrer.slice(0, 30), (refMap.get(c.referrer.slice(0, 30)) || 0) + 1);
      }
    });
    return Array.from(refMap.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  });

  constructor() {
    // Render chart reactively when timeline data or canvas changes
    effect(() => {
      const data = this.store.timeline();
      const el = this.timelineCanvas();
      if (!el || data.length === 0) return;

      if (this.chart) {
        this.chart.destroy();
      }

      const labels = data.map(d => {
        const dt = new Date(d.date);
        return dt.toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' });
      });

      this.chart = new Chart(el.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Clics',
              data: data.map(d => d.count),
              fill: true,
              backgroundColor: 'rgba(108, 92, 231, 0.08)',
              borderColor: '#6C5CE7',
              borderWidth: 2,
              pointBackgroundColor: '#6C5CE7',
              pointBorderColor: '#FFFFFF',
              pointBorderWidth: 2,
              pointRadius: 3,
              pointHoverRadius: 5,
              tension: 0.35,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1E1B4B',
              titleFont: { size: 12 },
              bodyFont: { size: 13, weight: 'bold' },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                title: items => {
                  if (items.length === 0) return '';
                  const idx = items[0].dataIndex;
                  const date = data[idx].date;
                  return new Date(date).toLocaleDateString('fr-CH', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  });
                },
                label: item => ` ${item.raw} clics`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                font: { size: 11 },
                color: '#9CA3AF',
                maxTicksLimit: 15,
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.04)' },
              ticks: {
                font: { size: 11 },
                color: '#9CA3AF',
                precision: 0,
              },
            },
          },
          interaction: {
            mode: 'index',
            intersect: false,
          },
        },
      });
    });
  }

  ngOnInit(): void {
    if (!this.store.stats()) {
      this.store.loadAll();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  onPeriodChange(label: string, days: number): void {
    this.activePeriod.set(label);
    const slug = this.store.selectedEventSlug() ?? undefined;
    if (days === 0) {
      this.store.loadAll({ eventSlug: slug, startDate: undefined, endDate: undefined });
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      this.store.loadAll({
        eventSlug: slug,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
    }
  }

  onEventFilter(slug: string | null): void {
    const startDate = this.store.startDate() ?? undefined;
    const endDate = this.store.endDate() ?? undefined;
    this.store.loadAll({ eventSlug: slug ?? undefined, startDate, endDate });
  }

  onRefresh(): void {
    this.store.loadAll({
      eventSlug: this.store.selectedEventSlug() ?? undefined,
      startDate: this.store.startDate() ?? undefined,
      endDate: this.store.endDate() ?? undefined,
    });
  }

  getSourceIcon(source: string): string {
    const map: Record<string, string> = {
      meta: 'campaign',
      facebook: 'campaign',
      instagram: 'photo_camera',
      google: 'search',
      direct: 'link',
      email: 'email',
      newsletter: 'mail',
      tiktok: 'videocam',
      twitter: 'tag',
      linkedin: 'work',
    };
    return map[source.toLowerCase()] || 'public';
  }

  getSourceColor(source: string): string {
    const map: Record<string, string> = {
      meta: '#6C5CE7',
      facebook: '#1877F2',
      instagram: '#E4405F',
      google: '#4285F4',
      direct: '#10B981',
      email: '#F59E0B',
      newsletter: '#F59E0B',
      tiktok: '#000000',
      twitter: '#1DA1F2',
      linkedin: '#0A66C2',
    };
    return map[source.toLowerCase()] || '#6C5CE7';
  }

  getDeviceIcon(device: string): string {
    const map: Record<string, string> = {
      mobile: 'smartphone',
      desktop: 'computer',
      tablet: 'tablet',
    };
    return map[device?.toLowerCase()] || 'devices';
  }

  getDeviceColor(device: string): string {
    const map: Record<string, string> = {
      mobile: '#6366f1',
      desktop: '#10b981',
      tablet: '#f59e0b',
    };
    return map[device?.toLowerCase()] || '#94a3b8';
  }

  truncateReferrer(referrer: string | null): string {
    if (!referrer) return 'direct';
    try {
      return new URL(referrer).hostname;
    } catch {
      return referrer.length > 30 ? referrer.slice(0, 30) + '...' : referrer;
    }
  }
}
