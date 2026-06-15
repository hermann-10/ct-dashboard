import { Component, inject, signal, OnInit, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  private readonly platformId = inject(PLATFORM_ID);

  events = signal<PublicEvent[]>([]);
  pastEvents = signal<PublicEvent[]>([]);
  loading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      const [upcoming, past] = await Promise.all([
        this.supabase.getUpcomingEvents(),
        this.supabase.getPastEvents(),
        this.initFacebookPixel(),
      ]);
      this.events.set(upcoming);
      this.pastEvents.set(past);
    } catch (e) {
      console.error('Failed to load events', e);
    } finally {
      this.loading.set(false);
    }
  }

  private async initFacebookPixel(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const pixelId = await this.supabase.getSetting('fb_pixel_id');
      if (!pixelId) return;
      // Inject Facebook Pixel
      const script = document.createElement('script');
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
      // Add noscript pixel
      const noscript = document.createElement('noscript');
      const img = document.createElement('img');
      img.height = 1;
      img.width = 1;
      img.style.display = 'none';
      img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
      noscript.appendChild(img);
      document.body.appendChild(noscript);
    } catch {
      // Silently fail if settings table doesn't exist yet
    }
  }

  onTicketClick(event: PublicEvent): void {
    // Fire Facebook Pixel event if available
    if (isPlatformBrowser(this.platformId) && (window as any).fbq) {
      (window as any).fbq('track', 'ViewContent', {
        content_name: event.name,
        content_ids: [event.slug],
        content_type: 'event',
      });
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
