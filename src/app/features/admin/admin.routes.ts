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
        path: 'traffic',
        loadChildren: () =>
          import('../traffic/traffic.routes').then(m => m.TRAFFIC_ROUTES),
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
        path: 'artists',
        loadChildren: () =>
          import('../artists/artists.routes').then(m => m.ARTISTS_ROUTES),
      },
      {
        path: 'bar',
        loadChildren: () =>
          import('../bar/bar.routes').then(m => m.BAR_ROUTES),
      },
      {
        path: 'newsletter',
        loadChildren: () =>
          import('../newsletter/newsletter.routes').then(m => m.NEWSLETTER_ROUTES),
      },
      {
        path: 'users',
        loadChildren: () =>
          import('../users/users.routes').then(m => m.USERS_ROUTES),
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
