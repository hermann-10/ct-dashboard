import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { filter, map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStore } from '../auth/auth.store';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);

  userEmail = this.auth.user;
  displayName = this.auth.displayName;

  readonly navItems: NavItem[] = [
    { path: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/admin/traffic', icon: 'insights', label: 'Traffic' },
    { path: '/admin/events', icon: 'event', label: 'Événements' },
    { path: '/admin/artists', icon: 'album', label: 'Artistes' },
    { path: '/admin/management', icon: 'work', label: 'Management' },
    { path: '/admin/documents', icon: 'folder_open', label: 'Documents' },
    { path: '/admin/logistics', icon: 'inventory_2', label: 'Logistique' },
    { path: '/admin/bar', icon: 'local_bar', label: 'Bar / Produits' },
    { path: '/admin/newsletter', icon: 'mail_outline', label: 'Newsletter' },
    { path: '/admin/users', icon: 'people', label: 'Utilisateurs' },
    { path: '/admin/settings', icon: 'settings', label: 'Paramètres' },
  ];

  readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 900px)').pipe(map(r => r.matches)),
    { initialValue: false }
  );

  sidenavOpened = signal(true);

  readonly initials = computed(() => {
    const name = this.displayName() || this.userEmail()?.email || 'HM';
    return name
      .split(/[\s.@_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0]!.toUpperCase())
      .join('');
  });

  constructor() {
    // Sidebar dépliée sur desktop, fermée sur mobile (réagit aussi au resize)
    effect(() => this.sidenavOpened.set(!this.isMobile()));

    // Sur mobile, fermer automatiquement la sidebar après chaque navigation
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        if (this.isMobile()) {
          this.sidenavOpened.set(false);
        }
      });
  }

  onToggleSidenav(): void {
    this.sidenavOpened.update(v => !v);
  }

  onLogout(): void {
    this.auth.logout();
  }
}
