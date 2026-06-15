import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('../dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
      },
      {
        path: 'events',
        loadChildren: () =>
          import('../events-admin/events-admin.routes').then(m => m.EVENTS_ADMIN_ROUTES),
      },
      {
        path: 'event/:slug/manage',
        loadChildren: () =>
          import('../event-management/event-management.routes').then(m => m.EVENT_MANAGEMENT_ROUTES),
      },
      {
        path: 'event/:slug',
        loadChildren: () =>
          import('../event-detail/event-detail.routes').then(m => m.EVENT_DETAIL_ROUTES),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('../settings/settings.routes').then(m => m.SETTINGS_ROUTES),
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('../notifications/notification.routes').then(m => m.NOTIFICATION_ROUTES),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
