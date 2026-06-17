import { Component, input, signal, effect, computed, ElementRef, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Chart, registerables, TooltipItem } from 'chart.js';
import { TimelinePoint, EventTimelineData } from '../../dashboard.model';

Chart.register(...registerables);

const EVENT_COLORS = [
  { line: '#6C5CE7', fill: 'rgba(108, 92, 231, 0.12)' },
  { line: '#EC4899', fill: 'rgba(236, 72, 153, 0.10)' },
  { line: '#10B981', fill: 'rgba(16, 185, 129, 0.10)' },
  { line: '#F59E0B', fill: 'rgba(245, 158, 11, 0.10)' },
  { line: '#06B6D4', fill: 'rgba(6, 182, 212, 0.10)' },
  { line: '#A855F7', fill: 'rgba(168, 85, 247, 0.10)' },
  { line: '#EF4444', fill: 'rgba(239, 68, 68, 0.10)' },
  { line: '#14B8A6', fill: 'rgba(20, 184, 166, 0.10)' },
];

const PAGE_SIZE = 14;

@Component({
  selector: 'app-clicks-chart',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="chart-card">
      <div class="chart-header">
        <span class="chart-title">Clics par jour</span>
        <div class="chart-nav">
          <span class="date-range-label">{{ dateRangeLabel() }}</span>
          <button mat-icon-button (click)="onPrev()" [disabled]="!canGoPrev()" matTooltip="Période précédente">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <button mat-icon-button (click)="onNext()" [disabled]="!canGoNext()" matTooltip="Période suivante">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </div>
      <div class="chart-container">
        <canvas #chartCanvas></canvas>
      </div>
      @if (timeline().length === 0) {
        <p class="no-data">Aucune donnée disponible</p>
      }
    </div>
  `,
  styles: `
    .chart-card {
      background: var(--hm-surface, #fff);
      border: 1px solid var(--hm-border, #E5E7EB);
      border-radius: var(--hm-radius-md, 12px);
      padding: 1.25rem;
    }
    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .chart-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--hm-text-primary, #1E1B4B);
    }
    .chart-nav {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .date-range-label {
      font-size: 0.75rem;
      color: var(--hm-text-tertiary, #9CA3AF);
      white-space: nowrap;
    }
    .chart-container { position: relative; height: 280px; }
    .no-data {
      text-align: center;
      color: var(--hm-text-tertiary, #9CA3AF);
      font-size: var(--hm-text-sm, 0.8125rem);
      padding: 2rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClicksChartComponent {
  timeline = input<TimelinePoint[]>([]);
  eventTimeline = input<EventTimelineData | null>(null);

  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;

  pageOffset = signal(0);

  private totalDays = computed(() => {
    const et = this.eventTimeline();
    return et ? et.dates.length : this.timeline().length;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalDays() / PAGE_SIZE)));

  canGoPrev = computed(() => {
    const offset = this.pageOffset();
    const total = this.totalDays();
    return (offset + 1) * PAGE_SIZE < total;
  });

  canGoNext = computed(() => this.pageOffset() > 0);

  dateRangeLabel = computed(() => {
    const et = this.eventTimeline();
    const dates = et ? et.dates : this.timeline().map(t => t.date);
    if (dates.length === 0) return '';
    const { start, end } = this.getPageSlice(dates);
    const sliced = dates.slice(start, end);
    if (sliced.length === 0) return '';
    const fmt = (d: string) => new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' });
    return `${fmt(sliced[0])} — ${fmt(sliced[sliced.length - 1])}`;
  });

  constructor() {
    effect(() => {
      const data = this.timeline();
      const et = this.eventTimeline();
      const el = this.canvas();
      const _offset = this.pageOffset();
      if (!el) return;

      if (this.chart) this.chart.destroy();

      if (et && et.dates.length > 0 && et.datasets.length > 0) {
        this.renderStackedChart(el.nativeElement, et);
      } else if (data.length > 0) {
        this.renderSimpleChart(el.nativeElement, data);
      }
    });
  }

  onPrev(): void {
    this.pageOffset.update(v => v + 1);
  }

  onNext(): void {
    this.pageOffset.update(v => Math.max(0, v - 1));
  }

  private getPageSlice(allDates: string[]): { start: number; end: number } {
    const total = allDates.length;
    const offset = this.pageOffset();
    const end = total - (offset * PAGE_SIZE);
    const start = Math.max(0, end - PAGE_SIZE);
    return { start, end: Math.max(start, end) };
  }

  private formatLabels(dates: string[]): string[] {
    return dates.map(d => {
      const dt = new Date(d);
      return dt.toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' });
    });
  }

  private renderStackedChart(canvas: HTMLCanvasElement, et: EventTimelineData): void {
    const { start, end } = this.getPageSlice(et.dates);
    const visibleDates = et.dates.slice(start, end);
    const labels = this.formatLabels(visibleDates);

    const datasets = et.datasets.map((ds, i) => {
      const color = EVENT_COLORS[i % EVENT_COLORS.length];
      return {
        label: ds.name,
        data: ds.data.slice(start, end),
        borderColor: color.line,
        backgroundColor: color.fill,
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: color.line,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      };
    });

    this.chart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: et.datasets.length > 1,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 6,
              padding: 16,
              font: { size: 11, family: 'Roboto' },
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#1E1B4B',
            titleFont: { size: 12, family: 'Roboto' },
            bodyFont: { size: 11, family: 'Roboto' },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title: (items: TooltipItem<'line'>[]) => {
                if (items.length === 0) return '';
                const idx = items[0].dataIndex;
                const date = visibleDates[idx];
                return new Date(date).toLocaleDateString('fr-CH', {
                  weekday: 'long', day: 'numeric', month: 'long',
                });
              },
              afterBody: (items: TooltipItem<'line'>[]) => {
                const total = items.reduce((sum, item) => sum + (item.raw as number), 0);
                return [`Total: ${total} clic${total > 1 ? 's' : ''}`];
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, family: 'Roboto' }, color: '#9CA3AF' },
          },
          y: {
            beginAtZero: true,
            ticks: { font: { size: 10, family: 'Roboto' }, color: '#9CA3AF', precision: 0 },
            grid: { color: '#F3F4F6' },
          },
        },
      },
    });
  }

  private renderSimpleChart(canvas: HTMLCanvasElement, data: TimelinePoint[]): void {
    const { start, end } = this.getPageSlice(data.map(d => d.date));
    const sliced = data.slice(start, end);
    const labels = this.formatLabels(sliced.map(d => d.date));

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Clics',
          data: sliced.map(d => d.count),
          borderColor: '#6C5CE7',
          backgroundColor: 'rgba(108, 92, 231, 0.12)',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#6C5CE7',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E1B4B',
            titleFont: { size: 12, family: 'Roboto' },
            bodyFont: { size: 11, family: 'Roboto' },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title: (items: TooltipItem<'line'>[]) => {
                if (items.length === 0) return '';
                const idx = items[0].dataIndex;
                const date = sliced[idx].date;
                return new Date(date).toLocaleDateString('fr-CH', {
                  weekday: 'long', day: 'numeric', month: 'long',
                });
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, family: 'Roboto' }, color: '#9CA3AF' },
          },
          y: {
            beginAtZero: true,
            ticks: { font: { size: 10, family: 'Roboto' }, color: '#9CA3AF', precision: 0 },
            grid: { color: '#F3F4F6' },
          },
        },
      },
    });
  }
}
