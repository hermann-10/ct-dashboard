import { Component, inject, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { PrivacyService } from '../../core/services/privacy.service';
import { Router } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { DashboardStore } from './dashboard.store';
import { AuthStore } from '../auth/auth.store';
import { ClicksChartComponent } from './components/clicks-chart';
import { DeviceBreakdownComponent } from './components/device-breakdown';
import { UtmTableComponent } from './components/utm-table';
import { EventsListComponent } from './components/events-list';
import { NotificationCenterComponent } from '../notifications';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSelectModule,
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
  private readonly privacy = inject(PrivacyService);
  readonly hideAmounts = this.privacy.hideAmounts;

  onToggleAmounts(): void {
    this.privacy.toggle();
  }

  readonly store = inject(DashboardStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  userEmail = this.auth.user;

  readonly periods = [
    { label: '7j', days: 7 },
    { label: '30j', days: 30 },
    { label: '90j', days: 90 },
    { label: 'Tout', days: 0 },
  ];
  activePeriod = signal('Tout');

  // ── Navigation de période (cartes CA + chiffres par soirée) ──
  periodMode = signal<'month' | 'year' | 'total'>('month');
  periodAnchor = signal(new Date());

  private readonly periodPrefix = computed(() => {
    if (this.periodMode() === 'total') return '';
    const d = this.periodAnchor();
    const y = d.getFullYear();
    return this.periodMode() === 'month'
      ? `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : String(y);
  });

  periodLabel = computed(() => {
    if (this.periodMode() === 'total') return 'Depuis le début';
    const d = this.periodAnchor();
    return this.periodMode() === 'month'
      ? d.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' })
      : String(d.getFullYear());
  });

  isCurrentPeriod = computed(() => {
    if (this.periodMode() === 'total') return true;
    const now = new Date();
    const p = this.periodMode() === 'month'
      ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      : String(now.getFullYear());
    return this.periodPrefix() === p;
  });

  periodStats = computed(() => {
    const fin = this.store.financials();
    const p = this.periodPrefix();
    const sum = (rows: { amount: number; event_date: string }[]) =>
      rows.filter(r => r.event_date.startsWith(p)).reduce((s, r) => s + r.amount, 0);
    const recettes = sum(fin?.revenues ?? []);
    const charges = sum(fin?.charges ?? []);
    return { recettes, charges, result: recettes - charges };
  });

  periodEvents = computed(() =>
    this.store.perEventFinancials().filter(e => e.date.startsWith(this.periodPrefix()))
  );

  shiftPeriod(delta: number): void {
    if (this.periodMode() === 'total') return;
    const d = new Date(this.periodAnchor());
    if (this.periodMode() === 'month') {
      d.setDate(1);
      d.setMonth(d.getMonth() + delta);
    } else {
      d.setFullYear(d.getFullYear() + delta);
    }
    this.periodAnchor.set(d);
  }

  resetPeriod(): void {
    this.periodAnchor.set(new Date());
  }

  daysUntilLabel(date: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date + 'T00:00:00');
    const days = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (days <= 0) return "Aujourd'hui";
    if (days === 1) return 'Demain';
    return `Dans ${days} jours`;
  }

  isUpcoming(date: string): boolean {
    return date >= new Date().toISOString().split('T')[0];
  }

  onManageEvent(slug: string): void {
    this.router.navigate(['/admin/event', slug, 'manage']);
  }

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
}
