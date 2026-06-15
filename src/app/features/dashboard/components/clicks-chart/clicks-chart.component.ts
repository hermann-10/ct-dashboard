import { Component, input, output, signal, effect, computed, ElementRef, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Chart, registerables, TooltipItem } from 'chart.js';
import { TimelinePoint, EventTimelineData } from '../../dashboard.model';

Chart.register(...registerables);

const EVENT_COLORS = [
  { bg: 'rgba(99, 102, 241, 0.7)', border: '#6366f1' },   // indigo
  { bg: 'rgba(236, 72, 153, 0.7)', border: '#ec4899' },    // pink
  { bg: 'rgba(34, 197, 94, 0.7)', border: '#22c55e' },     // green
  { bg: 'rgba(245, 158, 11, 0.7)', border: '#f59e0b' },    // amber
  { bg: 'rgba(6, 182, 212, 0.7)', border: '#06b6d4' },     // cyan
  { bg: 'rgba(168, 85, 247, 0.7)', border: '#a855f7' },    // purple
  { bg: 'rgba(239, 68, 68, 0.7)', border: '#ef4444' },     // red
  { bg: 'rgba(20, 184, 166, 0.7)', border: '#14b8a6' },    // teal
];

const PAGE_SIZE = 14; // Show 14 days per page

@Component({
  selector: 'app-clicks-chart',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <mat-card class="chart-card">
      <mat-card-header>
        <mat-card-title>Clics par jour</mat-card-title>
        <div class="chart-nav">
          <span class="date-range-label">{{ dateRangeLabel() }}</span>
          <button mat-icon-button
            (click)="onPrev()"
            [disabled]="!canGoPrev()"
            matTooltip="Période précédente">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <button mat-icon-button
            (click)="onNext()"
            [disabled]="!canGoNext()"
            matTooltip="Période suivante">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </mat-card-header>
      <mat-card-content>
        <div class="chart-container">
          <canvas #chartCanvas></canvas>
        </div>
        @if (timeline().length === 0) {
          <p class="no-data">Aucune donnée disponible</p>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .chart-card { padding: 1rem; }
    .chart-container { position: relative; height: 300px; }
    .no-data { text-align: center; opacity: 0.5; padding: 2rem; }

    mat-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .chart-nav {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .date-range-label {
      font-size: 0.8rem;
      opacity: 0.6;
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClicksChartComponent {
  timeline = input<TimelinePoint[]>([]);
  eventTimeline = input<EventTimelineData | null>(null);

  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;

  pageOffset = signal(0); // 0 = last page (most recent data)

  // Total number of data points
  private totalDays = computed(() => {
    const et = this.eventTimeline();
    return et ? et.dates.length : this.timeline().length;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalDays() / PAGE_SIZE)));

  // Current page index from the end
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
      const _offset = this.pageOffset(); // track reactivity
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
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 1,
        borderRadius: 4,
      };
    });

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: et.datasets.length > 1,
            position: 'bottom',
            labels: { boxWidth: 12, padding: 12, font: { size: 11 } },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: (items: TooltipItem<'bar'>[]) => {
                if (items.length === 0) return '';
                const idx = items[0].dataIndex;
                const date = visibleDates[idx];
                return new Date(date).toLocaleDateString('fr-CH', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                });
              },
              afterBody: (items: TooltipItem<'bar'>[]) => {
                const total = items.reduce((sum, item) => sum + (item.raw as number), 0);
                return [`\nTotal: ${total} clic${total > 1 ? 's' : ''}`];
              },
            },
          },
        },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    });
  }

  private renderSimpleChart(canvas: HTMLCanvasElement, data: TimelinePoint[]): void {
    const { start, end } = this.getPageSlice(data.map(d => d.date));
    const sliced = data.slice(start, end);
    const labels = this.formatLabels(sliced.map(d => d.date));

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Clics',
          data: sliced.map(d => d.count),
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items: TooltipItem<'bar'>[]) => {
                if (items.length === 0) return '';
                const idx = items[0].dataIndex;
                const date = sliced[idx].date;
                return new Date(date).toLocaleDateString('fr-CH', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                });
              },
            },
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    });
  }
}
