import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DashboardStore } from './dashboard.store';
import { AuthStore } from '../auth/auth.store';
import { KpiCardsComponent } from './components/kpi-cards';
import { ClicksChartComponent } from './components/clicks-chart';
import { DeviceBreakdownComponent } from './components/device-breakdown';
import { UtmTableComponent } from './components/utm-table';
import { EventsListComponent } from './components/events-list';
import { NotificationCenterComponent } from '../notifications';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonToggleModule,
    KpiCardsComponent,
    ClicksChartComponent,
    DeviceBreakdownComponent,
    UtmTableComponent,
    EventsListComponent,
    NotificationCenterComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  readonly store = inject(DashboardStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  userEmail = this.auth.user;

  // Preset periods
  readonly periods = [
    { label: '7j', days: 7 },
    { label: '30j', days: 30 },
    { label: '90j', days: 90 },
    { label: 'Tout', days: 0 },
  ];
  activePeriod = signal('Tout');

  private customStart: Date | null = null;
  private customEnd: Date | null = null;

  ngOnInit(): void {
    this.store.loadAll();
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

  onCustomStart(date: Date | null): void {
    this.customStart = date;
  }

  onCustomEnd(date: Date | null): void {
    this.customEnd = date;
    if (this.customStart && this.customEnd) {
      this.activePeriod.set('custom');
      const slug = this.store.selectedEventSlug() ?? undefined;
      this.store.loadAll({
        eventSlug: slug,
        startDate: this.customStart.toISOString(),
        endDate: this.customEnd.toISOString(),
      });
    }
  }

  onEventFilter(slug: string | null): void {
    const startDate = this.store.startDate() ?? undefined;
    const endDate = this.store.endDate() ?? undefined;
    this.store.loadAll({ eventSlug: slug ?? undefined, startDate, endDate });
  }

  onViewEvent(slug: string): void {
    this.router.navigate(['/admin/event', slug]);
  }

  onRefresh(): void {
    const slug = this.store.selectedEventSlug() ?? undefined;
    const startDate = this.store.startDate() ?? undefined;
    const endDate = this.store.endDate() ?? undefined;
    this.store.loadAll({ eventSlug: slug, startDate, endDate });
  }

  onLogout(): void {
    this.auth.logout();
  }
}
