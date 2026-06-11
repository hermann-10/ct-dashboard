import { Component, input, effect, ElementRef, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Chart, registerables } from 'chart.js';
import { DeviceBreakdown } from '../../dashboard.model';

Chart.register(...registerables);

const COLORS: Record<string, string> = {
  mobile: '#6366f1',
  desktop: '#10b981',
  tablet: '#f59e0b',
  unknown: '#94a3b8',
};

@Component({
  selector: 'app-device-breakdown',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card class="chart-card">
      <mat-card-header>
        <mat-card-title>Appareils</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="chart-container">
          <canvas #chartCanvas></canvas>
        </div>
        @if (devices().length === 0) {
          <p class="no-data">Aucune donnée</p>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .chart-card { padding: 1rem; }
    .chart-container { position: relative; height: 250px; max-width: 300px; margin: 0 auto; }
    .no-data { text-align: center; opacity: 0.5; padding: 2rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceBreakdownComponent {
  devices = input<DeviceBreakdown[]>([]);
  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const data = this.devices();
      const el = this.canvas();
      if (!el || data.length === 0) return;
      if (this.chart) this.chart.destroy();

      this.chart = new Chart(el.nativeElement, {
        type: 'doughnut',
        data: {
          labels: data.map(d => d.device),
          datasets: [{
            data: data.map(d => d.count),
            backgroundColor: data.map(d => COLORS[d.device] || COLORS['unknown']),
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { padding: 16 } },
          },
        },
      });
    });
  }
}
