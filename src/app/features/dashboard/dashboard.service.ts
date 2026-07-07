import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { EventConfig, ClickRecord, DeviceBreakdown, UtmBreakdown, TimelinePoint, DashboardStats, EventTimelineData } from './dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Load all events with click stats.
   * Fetches all clicks once and computes per-event stats client-side
   * instead of making 2N API calls (was N+1 pattern).
   */
  async getEvents(): Promise<EventConfig[]> {
    // 2 queries total (instead of 2N+1)
    const [events, allClicks] = await Promise.all([
      this.supabase.getEvents(),
      this.supabase.getClicks(),
    ]);

    // Build per-slug click counts in one pass
    const clicksBySlug = new Map<string, { total: number; ips: Set<string> }>();
    for (const click of allClicks) {
      const slug = click.event_slug ?? '';
      let entry = clicksBySlug.get(slug);
      if (!entry) {
        entry = { total: 0, ips: new Set() };
        clicksBySlug.set(slug, entry);
      }
      entry.total++;
      if (click.ip_hash) entry.ips.add(click.ip_hash);
    }

    return events.map((evt: any) => {
      const stats = clicksBySlug.get(evt.slug);
      return {
        slug: evt.slug,
        name: evt.name,
        destination: evt.ticket_url ?? '',
        date: evt.date,
        trackingUrl: `https://hm-events.ch/api/go?slug=${evt.slug}`,
        totalClicks: stats?.total ?? 0,
        uniqueVisitors: stats?.ips.size ?? 0,
      };
    });
  }

  /**
   * Get aggregated stats. Takes the already-loaded events to avoid
   * a redundant fetch (was calling getEvents() again just for .length).
   */
  async getStatsFromEvents(
    events: EventConfig[],
    eventSlug?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<DashboardStats> {
    const totalClicks = await this.supabase.getClicksCount(eventSlug, startDate, endDate);
    const uniqueVisitors = await this.supabase.getUniqueVisitors(eventSlug, startDate, endDate);
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
