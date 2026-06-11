import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupabaseService } from '../../core/services/supabase.service';

interface PublicEvent {
  id: string;
  slug: string;
  name: string;
  date: string;
  venue: string;
  city: string;
  ticket_url: string | null;
  image_url: string | null;
  image_emoji: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  events = signal<PublicEvent[]>([]);
  pastEvents = signal<PublicEvent[]>([]);
  loading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      const [upcoming, past] = await Promise.all([
        this.supabase.getUpcomingEvents(),
        this.supabase.getPastEvents(),
      ]);
      this.events.set(upcoming);
      this.pastEvents.set(past);
    } catch (e) {
      console.error('Failed to load events', e);
    } finally {
      this.loading.set(false);
    }
  }

  isToday(date: string): boolean {
    return date === new Date().toISOString().split('T')[0];
  }

  isSoon(date: string): boolean {
    const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }

  trackingUrl(slug: string): string {
    return `https://go.hm-events.ch/go/${slug}`;
  }
}
