import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { EventConfig, ClickRecord, DeviceBreakdown, UtmBreakdown, TimelinePoint, DashboardStats, EventTimelineData } from './dashboard.model';

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

  async getStats(eventSlug?: string, startDate?: string, endDate?: string): Promise<DashboardStats> {
    const totalClicks = await this.supabase.getClicksCount(eventSlug, startDate, endDate);
    const uniqueVisitors = await this.supabase.getUniqueVisitors(eventSlug, startDate, endDate);
    const events = await this.supabase.getEvents();
    const totalEvents = events.length;
    const conversionRate = totalClicks > 0 ? (uniqueVisitors / totalClicks) * 100 : 0;
    return { totalClicks, uniqueVisitors, totalEvents, conversionRate };
  }

  async getClicks(eventSlug?: string, startDate?: string, endDate?: string): Promise<ClickRecord[]> {
    const filters: { eventSlug?: string; startDate?: string; endDate?: string } = {};
    if (eventSlug) filters.eventSlug = eventSlug;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    return this.supabase.getClicks(Object.keys(filters).length ? filters : undefined);
  }

  async getDeviceBreakdown(eventSlug?: string, startDate?: string, endDate?: string): Promise<DeviceBreakdown[]> {
    return this.supabase.getDeviceBreakdown(eventSlug, startDate, endDate);
  }

  async getUtmBreakdown(eventSlug?: string, startDate?: string, endDate?: string): Promise<UtmBreakdown[]> {
    return this.supabase.getUtmBreakdown(eventSlug, startDate, endDate);
  }

  async getTimeline(eventSlug?: string, startDate?: string, endDate?: string): Promise<TimelinePoint[]> {
    return this.supabase.getClicksTimeline(eventSlug, startDate, endDate);
  }

  async getEventTimeline(events: EventConfig[], eventSlug?: string, startDate?: string, endDate?: string): Promise<EventTimelineData> {
    const raw = await this.supabase.getClicksTimeline(eventSlug, startDate, endDate);
    const dates = raw.map(r => r.date);

    // Collect all event slugs that appear
    const allSlugs = new Set<string>();
    raw.forEach((r: any) => {
      if (r.byEvent) {
        Object.keys(r.byEvent).forEach(s => allSlugs.add(s));
      }
    });

    // Build one dataset per event
    const eventNameMap = new Map(events.map(e => [e.slug, e.name]));
    const datasets = Array.from(allSlugs).map(slug => ({
      slug,
      name: eventNameMap.get(slug) ?? slug,
      data: dates.map(date => {
        const point = raw.find(r => r.date === date) as any;
        return point?.byEvent?.[slug] ?? 0;
      }),
    }));

    const totalPerDay = dates.map((_d, i) =>
      datasets.reduce((sum, ds) => sum + ds.data[i], 0)
    );

    return { dates, datasets, totalPerDay };
  }
}
