import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { EventConfig, ClickRecord, DeviceBreakdown, UtmBreakdown, TimelinePoint, DashboardStats } from './dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly supabase = inject(SupabaseService);

  /** Load all events from Supabase (with click counts) */
  async getEvents(): Promise<EventConfig[]> {
    const events = await this.supabase.getEvents();
    return Promise.all(
      events.map(async (evt: any) => {
        const totalClicks = await this.supabase.getClicksCount(evt.slug);
        const uniqueVisitors = await this.supabase.getUniqueVisitors(evt.slug);
        return {
          slug: evt.slug,
          name: evt.name,
          destination: evt.ticket_url ?? '',
          date: evt.date,
          trackingUrl: `https://hm-events.ch/api/go?slug=${evt.slug}`,
          totalClicks,
          uniqueVisitors,
        };
      })
    );
  }

  async getStats(eventSlug?: string): Promise<DashboardStats> {
    const totalClicks = await this.supabase.getClicksCount(eventSlug);
    const uniqueVisitors = await this.supabase.getUniqueVisitors(eventSlug);
    const events = await this.supabase.getEvents();
    const totalEvents = events.length;
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
