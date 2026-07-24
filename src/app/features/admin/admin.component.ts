import { Component, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { filter, map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthStore } from '../auth/auth.store';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
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

  readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 900px)').pipe(map(r => r.matches)),
    { initialValue: false }
  );

  sidenavOpened = signal(true);

  constructor() {
    // Sidenav ouverte sur desktop, fermée sur mobile (réagit aussi au resize)
    effect(() => this.sidenavOpened.set(!this.isMobile()));

    // Sur mobile, fermer automatiquement la sidenav après chaque navigation
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
