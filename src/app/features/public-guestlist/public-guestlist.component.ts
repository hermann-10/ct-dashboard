import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SupabaseService } from '../../core/services/supabase.service';
import QRCode from 'qrcode';

interface GuestEntry {
  id: string;
  guest_name: string;
  email: string | null;
  accompagnants: number;
  remarks: string | null;
  is_checked_in: boolean;
  checkin_token: string;
}

interface DraftGuestRow {
  name: string;
  accompagnants: number;
  remarks: string;
}

interface GuestlistData {
  id: string;
  artist_name: string;
  quota: number;
  share_token: string;
  event: {
    name: string;
    date: string;
    venue: string;
    city: string;
    image_url: string | null;
  };
  entries: GuestEntry[];
}

@Component({
  selector: 'app-public-guestlist',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './public-guestlist.component.html',
  styleUrl: './public-guestlist.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicGuestlistComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);

  guestlist = signal<GuestlistData | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);
  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  qrCodes = signal<Map<string, string>>(new Map());

  // Batch entry rows (empty fields ready to fill)
  rows = signal<DraftGuestRow[]>([]);

  entryCount = computed(() => {
    const entries = this.guestlist()?.entries ?? [];
    return entries.length + entries.reduce((s, e) => s + (e.accompagnants ?? 0), 0);
  });
  quota = computed(() => this.guestlist()?.quota ?? 0);
  fillPercent = computed(() => {
    const q = this.quota();
    return q > 0 ? Math.min(100, Math.round((this.entryCount() / q) * 100)) : 0;
  });
  isFull = computed(() => this.entryCount() >= this.quota());
  remainingPlaces = computed(() => Math.max(0, this.quota() - this.entryCount()));
  filledRows = computed(() => this.rows().filter(r => r.name.trim().length > 0));
  filledCount = computed(() => this.filledRows().length);
  newPersonsCount = computed(() =>
    this.filledRows().reduce((s, r) => s + 1 + (Number(r.accompagnants) || 0), 0)
  );
  eventDate = computed(() => {
    const d = this.guestlist()?.event?.date;
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-CH', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  });

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.loadGuestlist(token);
    } else {
      this.error.set('Lien invalide');
      this.loading.set(false);
    }
  }

  private async loadGuestlist(token: string): Promise<void> {
    try {
      const data = await this.supabase.getGuestlistByToken(token);
      data.entries.sort((a: GuestEntry, b: GuestEntry) =>
        a.guest_name.localeCompare(b.guest_name, 'fr')
      );
      this.guestlist.set(data);
      this.resetRows();
      await this.generateQrCodes(data.entries);
    } catch {
      this.error.set('Guestlist introuvable. Vérifiez le lien.');
    } finally {
      this.loading.set(false);
    }
  }

  // ── Batch rows management ──
  private resetRows(): void {
    const count = Math.max(1, Math.min(5, this.remainingPlaces()));
    this.rows.set(Array.from({ length: count }, () => this.emptyRow()));
  }

  private emptyRow(): DraftGuestRow {
    return { name: '', accompagnants: 0, remarks: '' };
  }

  addRow(): void {
    if (this.rows().length >= this.remainingPlaces()) return;
    this.rows.update(rows => [...rows, this.emptyRow()]);
  }

  removeRow(index: number): void {
    this.rows.update(rows =>
      rows.length > 1 ? rows.filter((_, i) => i !== index) : [this.emptyRow()]
    );
  }

  updateRow(index: number, patch: Partial<DraftGuestRow>): void {
    this.rows.update(rows =>
      rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  async onAddGuests(): Promise<void> {
    const gl = this.guestlist();
    if (!gl || this.isFull()) return;

    const toAdd = this.filledRows();
    if (toAdd.length === 0) return;

    // Check that all new persons (1 + accompagnants per row) fit within the remaining quota
    const remaining = this.remainingPlaces();
    if (this.newPersonsCount() > remaining) {
      this.showNotification('error', `Plus assez de places (${remaining} restante${remaining > 1 ? 's' : ''}).`);
      return;
    }

    this.saving.set(true);
    const added: GuestEntry[] = [];
    const succeeded = new Set<DraftGuestRow>();
    let failures = 0;
    try {
      for (const row of toAdd) {
        try {
          const entry = await this.supabase.createGuestlistEntry({
            guestlist_id: gl.id,
            guest_name: row.name.trim(),
            accompagnants: Number(row.accompagnants) || 0,
            remarks: row.remarks.trim() || undefined,
          });
          added.push(entry);
          succeeded.add(row);
        } catch {
          failures++;
        }
      }

      if (added.length > 0) {
        this.guestlist.set({
          ...gl,
          entries: [...gl.entries, ...added].sort((a: GuestEntry, b: GuestEntry) =>
            a.guest_name.localeCompare(b.guest_name, 'fr')
          ),
        });
        await this.generateQrCodes(added);
      }

      if (failures === 0) {
        this.showNotification(
          'success',
          added.length > 1 ? `${added.length} invités ajoutés !` : `${added[0].guest_name} ajouté(e) !`
        );
        this.resetRows();
      } else {
        // Keep the rows that failed (and the untouched ones) so nothing typed is lost
        this.rows.update(rows => {
          const kept = rows.filter(r => !succeeded.has(r));
          return kept.length > 0 ? kept : [this.emptyRow()];
        });
        this.showNotification('error', `${added.length} ajouté(s), ${failures} en erreur. Réessayez.`);
      }
    } finally {
      this.saving.set(false);
    }
  }

  async onRemoveGuest(entry: GuestEntry): Promise<void> {
    const gl = this.guestlist();
    if (!gl) return;

    this.saving.set(true);
    try {
      await this.supabase.deleteGuestlistEntry(entry.id);
      this.guestlist.set({
        ...gl,
        entries: gl.entries.filter(e => e.id !== entry.id),
      });
      this.showNotification('success', `${entry.guest_name} retiré(e).`);
    } catch {
      this.showNotification('error', 'Erreur lors de la suppression.');
    } finally {
      this.saving.set(false);
    }
  }

  getQrCode(token: string): string | undefined {
    return this.qrCodes().get(token);
  }

  private async generateQrCodes(entries: GuestEntry[]): Promise<void> {
    const currentMap = new Map(this.qrCodes());
    for (const entry of entries) {
      if (entry.checkin_token && !currentMap.has(entry.checkin_token)) {
        try {
          const dataUrl = await QRCode.toDataURL(entry.checkin_token, {
            width: 120,
            margin: 1,
            color: { dark: '#1e1e3c', light: '#ffffff' },
          });
          currentMap.set(entry.checkin_token, dataUrl);
        } catch { /* ignore QR generation errors */ }
      }
    }
    this.qrCodes.set(currentMap);
  }

  private showNotification(type: 'success' | 'error', message: string): void {
    this.notification.set({ type, message });
    setTimeout(() => this.notification.set(null), 3000);
  }
}
