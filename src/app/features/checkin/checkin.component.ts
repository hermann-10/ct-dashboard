import {
  Component, inject, signal, computed, OnInit, OnDestroy,
  ChangeDetectionStrategy, ElementRef, viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupabaseService } from '../../core/services/supabase.service';
import { ManagedEvent, EventGuestlist, GuestlistEntry } from '../event-management/event-management.model';

interface FlatEntry extends GuestlistEntry {
  artistName: string;
  guestlistId: string;
}

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './checkin.component.html',
  styleUrl: './checkin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckinComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);

  // State
  event = signal<ManagedEvent | null>(null);
  guestlists = signal<EventGuestlist[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  scanMode = signal(false);
  scanning = signal(false);
  notification = signal<{ type: 'success' | 'error' | 'info'; message: string; detail?: string } | null>(null);

  // Scanner
  private scanner: any = null;
  private lastScannedToken = '';

  // Refs
  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  // Computed
  allEntries = computed<FlatEntry[]>(() =>
    this.guestlists().flatMap(gl =>
      (gl.entries ?? []).map(e => ({
        ...e,
        artistName: gl.artist_name,
        guestlistId: gl.id,
      })),
    ),
  );

  filteredEntries = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const entries = this.allEntries();
    if (!term) return entries;
    return entries.filter(
      e => e.guest_name.toLowerCase().includes(term) || e.artistName.toLowerCase().includes(term),
    );
  });

  groupedFiltered = computed(() => {
    const entries = this.filteredEntries();
    const groups = new Map<string, { artistName: string; entries: FlatEntry[] }>();
    for (const e of entries) {
      if (!groups.has(e.guestlistId)) {
        groups.set(e.guestlistId, { artistName: e.artistName, entries: [] });
      }
      groups.get(e.guestlistId)!.entries.push(e);
    }
    return [...groups.values()];
  });

  totalGuests = computed(() => this.allEntries().length);
  checkedInCount = computed(() => this.allEntries().filter(e => e.is_checked_in).length);
  totalPersons = computed(() =>
    this.allEntries().reduce((s, e) => s + 1 + e.accompagnants, 0),
  );
  checkedInPersons = computed(() =>
    this.allEntries().filter(e => e.is_checked_in).reduce((s, e) => s + 1 + e.accompagnants, 0),
  );
  progressPercent = computed(() => {
    const total = this.totalGuests();
    return total > 0 ? Math.round((this.checkedInCount() / total) * 100) : 0;
  });

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.loading.set(false);
      return;
    }
    try {
      const event = await this.supabase.getEventBySlug(slug);
      this.event.set(event);
      const guestlists = await this.supabase.getEventGuestlists(event.id);
      this.guestlists.set(guestlists);
    } catch {
      this.showNotification('error', 'Impossible de charger les données.');
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  // ── Check-in toggle ──
  async onToggleCheckin(entry: FlatEntry): Promise<void> {
    const newState = !entry.is_checked_in;
    try {
      await this.supabase.updateGuestlistEntry(entry.id, { is_checked_in: newState });
      this.updateEntryState(entry.id, newState);
      if (newState) {
        const detail = entry.accompagnants > 0 ? `+${entry.accompagnants} accompagnant(s)` : undefined;
        this.showNotification('success', `✓ ${entry.guest_name}`, detail);
        this.vibrate();
      }
    } catch {
      this.showNotification('error', 'Erreur de check-in');
    }
  }

  // ── QR Scanner ──
  async toggleScan(): Promise<void> {
    if (this.scanMode()) {
      this.scanMode.set(false);
      this.stopScanner();
    } else {
      this.scanMode.set(true);
      this.searchTerm.set('');
      // Wait for DOM to render the reader element
      setTimeout(() => this.startScanner(), 100);
    }
  }

  private async startScanner(): Promise<void> {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      this.scanner = new Html5Qrcode('qr-reader');
      this.scanning.set(true);
      await this.scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => this.onQrScanned(decodedText),
        () => { /* ignore scan errors */ },
      );
    } catch {
      this.showNotification('error', 'Impossible d\'accéder à la caméra');
      this.scanMode.set(false);
      this.scanning.set(false);
    }
  }

  private stopScanner(): void {
    if (this.scanner) {
      try {
        this.scanner.stop().catch(() => {});
      } catch { /* ignore */ }
      this.scanner = null;
      this.scanning.set(false);
    }
  }

  private async onQrScanned(text: string): Promise<void> {
    // Extract token from QR content
    const token = this.extractToken(text);
    if (!token || token === this.lastScannedToken) return;
    this.lastScannedToken = token;

    // Find in local data first
    const entry = this.allEntries().find(e => e.checkin_token === token);
    if (entry) {
      if (entry.is_checked_in) {
        this.showNotification('info', `${entry.guest_name} déjà check-in`, `Liste: ${entry.artistName}`);
        this.vibrate([100, 50, 100]);
      } else {
        await this.onToggleCheckin(entry);
      }
    } else {
      // Try server-side lookup (might be from another event)
      const result = await this.supabase.checkinByToken(token);
      if (result) {
        this.showNotification('success', `✓ ${result.entry.guest_name}`, `Liste: ${result.artistName}`);
        this.vibrate();
        // Reload data to stay in sync
        await this.reloadGuestlists();
      } else {
        this.showNotification('error', 'QR code non reconnu');
        this.vibrate([200, 100, 200]);
      }
    }

    // Reset after 3 seconds to allow re-scan
    setTimeout(() => { this.lastScannedToken = ''; }, 3000);
  }

  private extractToken(text: string): string {
    // Support multiple QR formats:
    // 1. Plain token: "a1b2c3d4e5f6"
    // 2. URL: "https://hm-events.ch/checkin/verify/a1b2c3d4e5f6"
    // 3. Prefixed: "HMEVENTS:a1b2c3d4e5f6"
    if (text.includes('/checkin/verify/')) {
      return text.split('/checkin/verify/').pop() ?? '';
    }
    if (text.startsWith('HMEVENTS:')) {
      return text.replace('HMEVENTS:', '');
    }
    // Assume raw token (hex string, 16 chars)
    if (/^[a-f0-9]{16}$/i.test(text)) {
      return text;
    }
    return text;
  }

  // ── Helpers ──
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    if (this.scanMode()) {
      this.scanMode.set(false);
      this.stopScanner();
    }
  }

  countChecked(entries: FlatEntry[]): number {
    return entries.filter(e => e.is_checked_in).length;
  }

  onClearSearch(): void {
    this.searchTerm.set('');
    this.searchInput()?.nativeElement.focus();
  }

  private updateEntryState(entryId: string, isCheckedIn: boolean): void {
    this.guestlists.update(gls =>
      gls.map(gl => ({
        ...gl,
        entries: gl.entries.map(e =>
          e.id === entryId ? { ...e, is_checked_in: isCheckedIn } : e,
        ),
      })),
    );
  }

  private async reloadGuestlists(): Promise<void> {
    const ev = this.event();
    if (!ev) return;
    const gls = await this.supabase.getEventGuestlists(ev.id);
    this.guestlists.set(gls);
  }

  private showNotification(type: 'success' | 'error' | 'info', message: string, detail?: string): void {
    this.notification.set({ type, message, detail });
    setTimeout(() => this.notification.set(null), 3000);
  }

  private vibrate(pattern: number | number[] = 100): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }
}
