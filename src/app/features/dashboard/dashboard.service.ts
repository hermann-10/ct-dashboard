import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { EventConfig, ClickRecord, DeviceBreakdown, UtmBreakdown, TimelinePoint, DashboardStats } from './dashboard.model';

const EVENTS: Record<string, { name: string; destination: string; date: string }> = {
  'summer-vibes': {
    name: 'Summer Vibes Afro - Halle W',
    destination: 'https://eventfrog.ch/fr/p/soirees-fetes/soiree-a-theme/summer-vibes-afro-halle-w-7465431493805902516.html',
    date: '2026-06-05',
  },
  'basel-060626': {
    name: 'HM-Events - Club Cello Basel',
    destination: 'https://eventfrog.ch/fr/p/soirees-fetes/soiree-a-theme/comportement-tropical-club-cello-basel-7463963782672313961.html',
    date: '2026-06-06',
  },
};

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly supabase = inject(SupabaseService);

  async getEvents(): Promise<EventConfig[]> {
    return Promise.all(
      Object.entries(EVENTS).map(async ([slug, event]) => {
        const totalClicks = await this.supabase.getClicksCount(slug);
        const uniqueVisitors = await this.supabase.getUniqueVisitors(slug);
        return {
          slug,
          name: event.name,
          destination: event.destination,
          date: event.date,
          trackingUrl: `https://go.hm-events.ch/go/${slug}`,
          totalClicks,
          uniqueVisitors,
        };
      })
    );
  }

  async getStats(): Promise<DashboardStats> {
    const totalClicks = await this.supabase.getClicksCount();
    const uniqueVisitors = await this.supabase.getUniqueVisitors();
    const totalEvents = Object.keys(EVENTS).length;
    const conversionRate = totalClicks > 0 ? (uniqueVisitors / totalClicks) * 100 : 0;
    return { totalClicks, uniqueVisitors, totalEvents, conversionRate };
  }

  async getClicks(eventSlug?: string): Promise<ClickRecord[]> {
    return this.supabase.getClicks(eventSlug ? { eventSlug } : undefined);
  }

  async getDeviceBreakdown(eventSlug?: string): Promise<DeviceBreakdown[]> {
    return this.supabase.getDeviceBreakdown(eventSlug);
  }

  async getUtmBreakdown(eventSlug?: string): Promise<UtmBreakdown[]> {
    return this.supabase.getUtmBreakdown(eventSlug);
  }

  async getTimeline(eventSlug?: string): Promise<TimelinePoint[]> {
    return this.supabase.getClicksTimeline(eventSlug);
  }
}
