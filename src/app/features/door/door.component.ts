import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SupabaseService } from '../../core/services/supabase.service';

interface GuestEntry {
  id: string;
  guest_name: string;
  accompagnants: number;
  remarks: string | null;
  is_checked_in: boolean;
}

interface Guestlist {
  id: string;
  artist_name: string;
  quota: number;
  entries: GuestEntry[];
}

interface EventInfo {
  id: string;
  name: string;
  date: string;
  venue: string;
  city: string;
  image_url: string | null;
}

interface FlatGuest {
  artistName: string;
  guestlistId: string;
  entry: GuestEntry;
}

@Component({
  selector: 'app-door',
  standalone: true,
  imports: [
    MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule,
    MatSelectModule, MatProgressBarModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  templateUrl: './door.component.html',
  styleUrl: './door.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);

  event = signal<EventInfo | null>(null);
  guestlists = signal<Guestlist[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  togglingId = signal<string | null>(null);

  searchTerm = signal('');
  artistFilter = signal('');

  // Date formatted
  eventDate = computed(() => {
    const d = this.event()?.date;
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-CH', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  });

  // Artist names
  artistNames = computed(() =>
    this.guestlists().map(gl => gl.artist_name).sort((a, b) => a.localeCompare(b, 'fr'))
  );

  // Flatten all guests
  private allGuests = computed<FlatGuest[]>(() => {
    const result: FlatGuest[] = [];
    for (const gl of this.guestlists()) {
      for (const entry of gl.entries ?? []) {
        result.push({ artistName: gl.artist_name, guestlistId: gl.id, entry });
      }
    }
    return result.sort((a, b) => a.entry.guest_name.localeCompare(b.entry.guest_name, 'fr'));
  });

  // Filtered guests
  filteredGuests = computed(() => {
    let list = this.allGuests();
    const artist = this.artistFilter();
    if (artist) {
      list = list.filter(g => g.artistName === artist);
    }
    const term = this.searchTerm().toLowerCase().trim();
    if (term.length >= 1) {
      list = list.filter(g => g.entry.guest_name.toLowerCase().includes(term));
    }
    return list;
  });

  // Stats
  totalPersons = computed(() => {
    const guests = this.allGuests();
    return guests.length + guests.reduce((s, g) => s + (g.entry.accompagnants ?? 0), 0);
  });

  totalCapacity = computed(() =>
    this.guestlists().reduce((s, gl) => s + gl.quota, 0)
  );

  totalCheckedIn = computed(() =>
    this.allGuests().filter(g => g.entry.is_checked_in).length
  );

  checkedInPersons = computed(() => {
    const checked = this.allGuests().filter(g => g.entry.is_checked_in);
    return checked.length + checked.reduce((s, g) => s + (g.entry.accompagnants ?? 0), 0);
  });

  fillPercent = computed(() => {
    const cap = this.totalCapacity();
    return cap > 0 ? Math.min(100, Math.round((this.totalPersons() / cap) * 100)) : 0;
  });

  filteredCount = computed(() => this.filteredGuests().length);

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.error.set('Lien invalide');
      this.loading.set(false);
      return;
    }
    try {
      const data = await this.supabase.getEventGuestlistsBySlug(slug);
      this.event.set(data.event);
      this.guestlists.set(data.guestlists);
    } catch {
      this.error.set('Événement introuvable. Vérifiez le lien.');
    } finally {
      this.loading.set(false);
    }
  }

  async toggleCheckedIn(guest: FlatGuest): Promise<void> {
    this.togglingId.set(guest.entry.id);
    try {
      const newValue = !guest.entry.is_checked_in;
      await this.supabase.updateGuestlistEntry(guest.entry.id, { is_checked_in: newValue });
      // Update local state
      this.guestlists.update(lists =>
        lists.map(gl =>
          gl.id === guest.guestlistId
            ? {
                ...gl,
                entries: gl.entries.map(e =>
                  e.id === guest.entry.id ? { ...e, is_checked_in: newValue } : e
                ),
              }
            : gl
        )
      );
    } catch {
      // silently fail
    } finally {
      this.togglingId.set(null);
    }
  }
}
