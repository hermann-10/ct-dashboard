import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DashboardStore } from './dashboard.store';
import { AuthStore } from '../auth/auth.store';
import { KpiCardsComponent } from './components/kpi-cards';
import { ClicksChartComponent } from './components/clicks-chart';
import { DeviceBreakdownComponent } from './components/device-breakdown';
import { UtmTableComponent } from './components/utm-table';
import { EventsListComponent } from './components/events-list';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    KpiCardsComponent,
    ClicksChartComponent,
    DeviceBreakdownComponent,
    UtmTableComponent,
    EventsListComponent,
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

  ngOnInit(): void {
    this.store.loadAll();
  }

  onViewEvent(slug: string): void {
    this.router.navigate(['/admin/event', slug]);
  }

  onRefresh(): void {
    this.store.loadAll();
  }

  onLogout(): void {
    this.auth.logout();
  }
}
