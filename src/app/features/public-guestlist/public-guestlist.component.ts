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
  entryId?: string;
  checkedIn?: boolean;
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
  newRows = computed(() => this.rows().filter(r => !r.entryId && r.name.trim().length > 0));
  newCount = computed(() => this.newRows().length);
  draftRowCount = computed(() => this.rows().filter(r => !r.entryId).length);
  hasChanges = computed(() => {
    const gl = this.guestlist();
    if (!gl) return false;
    const byId = new Map(gl.entries.map(e => [e.id, e]));
    return this.rows().some(r => {
      if (!r.entryId) return r.name.trim().length > 0;
      if (r.checkedIn) return false;
      const orig = byId.get(r.entryId);
      if (!orig || !r.name.trim()) return false;
      return (
        r.name.trim() !== orig.guest_name ||
        (Number(r.accompagnants) || 0) !== (orig.accompagnants ?? 0) ||
        (r.remarks.trim() || null) !== (orig.remarks ?? null)
      );
    });
  });
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
      this.rebuildRows();
      await this.generateQrCodes(data.entries);
    } catch {
      this.error.set('Guestlist introuvable. Vérifiez le lien.');
    } finally {
      this.loading.set(false);
    }
  }

  // ── Rows management (existing entries pre-filled + empty rows for new guests) ──
  private rebuildRows(): void {
    const gl = this.guestlist();
    const entries = gl?.entries ?? [];
    const existing: DraftGuestRow[] = entries.map(e => ({
      entryId: e.id,
      checkedIn: e.is_checked_in,
      name: e.guest_name,
      accompagnants: e.accompagnants ?? 0,
      remarks: e.remarks ?? '',
    }));
    const emptyCount = Math.min(3, this.remainingPlaces());
    this.rows.set([
      ...existing,
      ...Array.from({ length: emptyCount }, () => this.emptyRow()),
    ]);
  }

  private emptyRow(): DraftGuestRow {
    return { name: '', accompagnants: 0, remarks: '' };
  }

  addRow(): void {
    if (this.draftRowCount() >= this.remainingPlaces()) return;
    this.rows.update(rows => [...rows, this.emptyRow()]);
  }

  async removeRow(index: number): Promise<void> {
    const row = this.rows()[index];
    if (!row) return;

    // Draft row: just remove it locally
    if (!row.entryId) {
      this.rows.update(rows => rows.filter((_, i) => i !== index));
      return;
    }

    // Existing entry: delete on the server
    const gl = this.guestlist();
    if (!gl) return;
    this.saving.set(true);
    try {
      await this.supabase.deleteGuestlistEntry(row.entryId);
      this.guestlist.set({
        ...gl,
        entries: gl.entries.filter(e => e.id !== row.entryId),
      });
      this.rows.update(rows => rows.filter((_, i) => i !== index));
      this.showNotification('success', `${row.name} retiré(e).`);
    } catch {
      this.showNotification('error', 'Erreur lors de la suppression.');
    } finally {
      this.saving.set(false);
    }
  }

  updateRow(index: number, patch: Partial<DraftGuestRow>): void {
    this.rows.update(rows =>
      rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  async onSaveGuests(): Promise<void> {
    const gl = this.guestlist();
    if (!gl || !this.hasChanges()) return;

    // Check that the total after save (existing + new, incl. accompagnants) fits the quota
    const totalAfter = this.rows()
      .filter(r => r.entryId || r.name.trim())
      .reduce((s, r) => s + 1 + (Number(r.accompagnants) || 0), 0);
    if (totalAfter > this.quota()) {
      const remaining = this.remainingPlaces();
      this.showNotification('error', `Plus assez de places (${remaining} restante${remaining > 1 ? 's' : ''}).`);
      return;
    }

    this.saving.set(true);
    const byId = new Map(gl.entries.map(e => [e.id, e]));
    let entries = [...gl.entries];
    const createdEntries: GuestEntry[] = [];
    const succeeded = new Set<DraftGuestRow>();
    let created = 0;
    let updated = 0;
    let failures = 0;

    try {
      for (const row of this.rows()) {
        const name = row.name.trim();

        if (row.entryId) {
          // Existing entry: update if modified (checked-in entries stay untouched)
          const orig = byId.get(row.entryId);
          if (!orig || row.checkedIn || !name) continue;
          const changes: Partial<{ guest_name: string; accompagnants: number; remarks: string | null }> = {};
          if (name !== orig.guest_name) changes.guest_name = name;
          const acc = Number(row.accompagnants) || 0;
          if (acc !== (orig.accompagnants ?? 0)) changes.accompagnants = acc;
          const rem = row.remarks.trim() || null;
          if (rem !== (orig.remarks ?? null)) changes.remarks = rem;
          if (Object.keys(changes).length === 0) continue;
          try {
            const entry = await this.supabase.updateGuestlistEntry(row.entryId, changes);
            entries = entries.map(e => (e.id === entry.id ? entry : e));
            updated++;
          } catch {
            failures++;
          }
        } else if (name) {
          // New guest
          try {
            const entry = await this.supabase.createGuestlistEntry({
              guestlist_id: gl.id,
              guest_name: name,
              accompagnants: Number(row.accompagnants) || 0,
              remarks: row.remarks.trim() || undefined,
            });
            entries = [...entries, entry];
            createdEntries.push(entry);
            succeeded.add(row);
            created++;
          } catch {
            failures++;
          }
        }
      }

      if (created > 0 || updated > 0) {
        this.guestlist.set({
          ...gl,
          entries: entries.sort((a: GuestEntry, b: GuestEntry) =>
            a.guest_name.localeCompare(b.guest_name, 'fr')
          ),
        });
        if (createdEntries.length > 0) {
          await this.generateQrCodes(createdEntries);
        }
      }

      if (failures === 0) {
        const parts: string[] = [];
        if (created > 0) parts.push(`${created} invité${created > 1 ? 's' : ''} ajouté${created > 1 ? 's' : ''}`);
        if (updated > 0) parts.push(`${updated} modifié${updated > 1 ? 's' : ''}`);
        this.showNotification('success', `${parts.join(' · ')} !`);
        this.rebuildRows();
      } else {
        // Rebuild from server state, then re-append the new rows that failed so nothing typed is lost
        const failedDrafts = this.rows().filter(r => !r.entryId && r.name.trim() && !succeeded.has(r));
        this.rebuildRows();
        if (failedDrafts.length > 0) {
          this.rows.update(rows => [...rows.filter(r => r.entryId), ...failedDrafts]);
        }
        this.showNotification('error', `${created + updated} enregistré(s), ${failures} en erreur. Réessayez.`);
      }
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
