import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { DashboardService } from '../dashboard/dashboard.service';
import { ClicksChartComponent } from '../dashboard/components/clicks-chart';
import { DeviceBreakdownComponent } from '../dashboard/components/device-breakdown';
import { UtmTableComponent } from '../dashboard/components/utm-table';
import { ClickRecord, EventConfig, TimelinePoint, DeviceBreakdown, UtmBreakdown } from '../dashboard/dashboard.model';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    MatToolbarModule, MatButtonModule, MatIconModule, MatCardModule,
    MatTableModule, MatChipsModule, MatProgressSpinnerModule, DatePipe,
    ClicksChartComponent, DeviceBreakdownComponent, UtmTableComponent,
  ],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(DashboardService);

  slug = signal('');
  event = signal<EventConfig | null>(null);
  clicks = signal<ClickRecord[]>([]);
  timeline = signal<TimelinePoint[]>([]);
  devices = signal<DeviceBreakdown[]>([]);
  utmSources = signal<UtmBreakdown[]>([]);
  loading = signal(true);

  clickColumns = ['time', 'device', 'source', 'referrer'];

  async ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.slug.set(slug);
    try {
      const [events, clicks, timeline, devices, utm] = await Promise.all([
        this.service.getEvents(),
        this.service.getClicks(slug),
        this.service.getTimeline(slug),
        this.service.getDeviceBreakdown(slug),
        this.service.getUtmBreakdown(slug),
      ]);
      this.event.set(events.find(e => e.slug === slug) ?? null);
      this.clicks.set(clicks.slice(0, 100));
      this.timeline.set(timeline);
      this.devices.set(devices);
      this.utmSources.set(utm);
    } catch (e) {
      console.error('Error loading event detail', e);
    } finally {
      this.loading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleString('fr-CH', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  copyTrackingUrl(): void {
    const url = this.event()?.trackingUrl;
    if (url) navigator.clipboard.writeText(url);
  }
}
