import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SupabaseService } from '../../core/services/supabase.service';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, MatBadgeModule, MatMenuModule, MatDividerModule, MatTooltipModule],
  template: `
    <button mat-icon-button [matMenuTriggerFor]="notifMenu" matTooltip="Notifications" (menuOpened)="onMenuOpen()">
      <mat-icon
        [matBadge]="unreadCount() > 0 ? unreadCount() : null"
        matBadgeColor="warn"
        matBadgeSize="small"
      >notifications</mat-icon>
    </button>

    <mat-menu #notifMenu="matMenu" class="notification-menu" xPosition="before">
      <div class="notif-header" (click)="$event.stopPropagation()">
        <span class="notif-title">Notifications</span>
        @if (unreadCount() > 0) {
          <button mat-button (click)="markAllRead()">Tout marquer lu</button>
        }
      </div>
      <mat-divider />

      @if (notifications().length === 0) {
        <div class="notif-empty" (click)="$event.stopPropagation()">
          <mat-icon>notifications_none</mat-icon>
          <p>Aucune notification</p>
        </div>
      } @else {
        @for (notif of notifications(); track notif.id) {
          <div
            class="notif-item"
            [class.unread]="!notif.is_read"
            (click)="markRead(notif); $event.stopPropagation()"
          >
            <mat-icon class="notif-icon" [class]="'type-' + notif.type">
              {{ getIcon(notif.type) }}
            </mat-icon>
            <div class="notif-content">
              <span class="notif-item-title">{{ notif.title }}</span>
              <span class="notif-message">{{ notif.message }}</span>
              <span class="notif-time">{{ notif.created_at | date:'d MMM, HH:mm' }}</span>
            </div>
            <button mat-icon-button class="notif-delete" (click)="deleteNotif(notif.id); $event.stopPropagation()" matTooltip="Supprimer">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }
      }
    </mat-menu>
  `,
  styles: [`
    :host { display: inline-flex; }

    .notif-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem 0.5rem;
      min-width: 340px;
    }

    .notif-title {
      font-weight: 600;
      font-size: 1rem;
    }

    .notif-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
      opacity: 0.5;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; }
      p { margin: 0.5rem 0 0; font-size: 0.85rem; }
    }

    .notif-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background 0.15s;
      border-left: 3px solid transparent;

      &:hover { background: rgba(0,0,0,0.04); }
      &.unread {
        background: rgba(255, 109, 0, 0.06);
        border-left-color: #ff6d00;
      }
    }

    .notif-icon {
      margin-top: 2px;
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;

      &.type-event_reminder { color: #2196f3; }
      &.type-click_threshold { color: #ff6d00; }
      &.type-system { color: #9c27b0; }
    }

    .notif-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .notif-item-title {
      font-weight: 600;
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notif-message {
      font-size: 0.8rem;
      opacity: 0.7;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .notif-time {
      font-size: 0.7rem;
      opacity: 0.5;
      margin-top: 2px;
    }

    .notif-delete {
      opacity: 0;
      transition: opacity 0.15s;
      .notif-item:hover & { opacity: 0.7; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  private readonly supabase = inject(SupabaseService);

  notifications = signal<Notification[]>([]);
  unreadCount = signal(0);
  private refreshInterval: any;

  async ngOnInit(): Promise<void> {
    await this.loadNotifications();
    // Refresh every 60 seconds
    this.refreshInterval = setInterval(() => this.loadUnreadCount(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  async onMenuOpen(): Promise<void> {
    await this.loadNotifications();
  }

  async loadNotifications(): Promise<void> {
    try {
      const [notifs, count] = await Promise.all([
        this.supabase.getNotifications(),
        this.supabase.getUnreadCount(),
      ]);
      this.notifications.set(notifs);
      this.unreadCount.set(count);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  }

  async loadUnreadCount(): Promise<void> {
    try {
      this.unreadCount.set(await this.supabase.getUnreadCount());
    } catch {}
  }

  async markRead(notif: Notification): Promise<void> {
    if (notif.is_read) return;
    await this.supabase.markNotificationRead(notif.id);
    this.notifications.update(list =>
      list.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
    );
    this.unreadCount.update(c => Math.max(0, c - 1));
  }

  async markAllRead(): Promise<void> {
    await this.supabase.markAllNotificationsRead();
    this.notifications.update(list =>
      list.map(n => ({ ...n, is_read: true }))
    );
    this.unreadCount.set(0);
  }

  async deleteNotif(id: string): Promise<void> {
    const notif = this.notifications().find(n => n.id === id);
    await this.supabase.deleteNotification(id);
    this.notifications.update(list => list.filter(n => n.id !== id));
    if (notif && !notif.is_read) {
      this.unreadCount.update(c => Math.max(0, c - 1));
    }
  }

  getIcon(type: string): string {
    switch (type) {
      case 'event_reminder': return 'event';
      case 'click_threshold': return 'trending_up';
      default: return 'info';
    }
  }
}
