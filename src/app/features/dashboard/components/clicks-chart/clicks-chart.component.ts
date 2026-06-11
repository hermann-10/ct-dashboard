import { Component, input, effect, ElementRef, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Chart, registerables } from 'chart.js';
import { TimelinePoint } from '../../dashboard.model';

Chart.register(...registerables);

@Component({
  selector: 'app-clicks-chart',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card class="chart-card">
      <mat-card-header>
        <mat-card-title>Clics par jour</mat-card-title>
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClicksChartComponent {
  timeline = input<TimelinePoint[]>([]);
  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const data = this.timeline();
      const el = this.canvas();
      if (!el || data.length === 0) return;

      if (this.chart) this.chart.destroy();

      this.chart = new Chart(el.nativeElement, {
        type: 'bar',
        data: {
          labels: data.map(d => {
            const dt = new Date(d.date);
            return dt.toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' });
          }),
          datasets: [{
            label: 'Clics',
            data: data.map(d => d.count),
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor: '#6366f1',
            borderWidth: 1,
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } },
          },
        },
      });
    });
  }
}
