import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DeviceBreakdown } from '../../dashboard.model';

const DEVICE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  mobile: { icon: 'smartphone', color: '#6C5CE7', label: 'Mobile' },
  desktop: { icon: 'computer', color: '#10B981', label: 'Desktop' },
  tablet: { icon: 'tablet', color: '#F59E0B', label: 'Tablette' },
  unknown: { icon: 'device_unknown', color: '#94A3B8', label: 'Autre' },
};

@Component({
  selector: 'app-device-breakdown',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="device-card">
      <span class="card-title">Appareils</span>
      @if (devices().length > 0) {
        <div class="device-list">
          @for (item of devicesWithPercent(); track item.device) {
            <div class="device-row">
              <div class="device-info">
                <div class="device-icon" [style.background]="getConfig(item.device).color + '12'">
                  <mat-icon [style.color]="getConfig(item.device).color">{{ getConfig(item.device).icon }}</mat-icon>
                </div>
                <div class="device-text">
                  <span class="device-label">{{ getConfig(item.device).label }}</span>
                  <span class="device-count">{{ item.count }} clic{{ item.count > 1 ? 's' : '' }}</span>
                </div>
              </div>
              <span class="device-percent">{{ item.percent }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="item.percent" [style.background]="getConfig(item.device).color"></div>
            </div>
          }
        </div>
      } @else {
        <p class="no-data">Aucune donnée</p>
      }
    </div>
  `,
  styles: `
    .device-card {
      background: var(--hm-surface, #fff);
      border: 1px solid var(--hm-border, #E5E7EB);
      border-radius: var(--hm-radius-md, 12px);
      padding: 1.25rem;
      height: 100%;
    }
    .card-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--hm-text-primary, #1E1B4B);
      display: block;
      margin-bottom: 1rem;
    }
    .device-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .device-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .device-info {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }
    .device-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }
    .device-text {
      display: flex;
      flex-direction: column;
    }
    .device-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--hm-text-primary, #1E1B4B);
    }
    .device-count {
      font-size: 0.6875rem;
      color: var(--hm-text-tertiary, #9CA3AF);
    }
    .device-percent {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--hm-text-primary, #1E1B4B);
    }
    .progress-track {
      height: 4px;
      background: var(--hm-border-light, #F3F4F6);
      border-radius: 2px;
      overflow: hidden;
      margin-top: -0.25rem;
    }
    .progress-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.4s ease;
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
export class DeviceBreakdownComponent {
  devices = input<DeviceBreakdown[]>([]);

  devicesWithPercent = computed(() => {
    const data = this.devices();
    const total = data.reduce((s, d) => s + d.count, 0);
    return data
      .map(d => ({
        device: d.device,
        count: d.count,
        percent: total > 0 ? Math.round((d.count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  });

  getConfig(device: string) {
    return DEVICE_CONFIG[device] || DEVICE_CONFIG['unknown'];
  }
}
