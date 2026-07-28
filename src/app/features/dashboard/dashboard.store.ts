import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { DashboardService } from './dashboard.service';
import { EventConfig, ClickRecord, DeviceBreakdown, UtmBreakdown, TimelinePoint, DashboardStats, EventTimelineData, EventFinancials } from './dashboard.model';

interface DashboardState {
  events: EventConfig[];
  stats: DashboardStats | null;
  recentClicks: ClickRecord[];
  deviceBreakdown: DeviceBreakdown[];
  utmBreakdown: UtmBreakdown[];
  timeline: TimelinePoint[];
  eventTimeline: EventTimelineData | null;
  financials: EventFinancials | null;
  selectedEventSlug: string | null;
  startDate: string | null;
  endDate: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  events: [],
  stats: null,
  recentClicks: [],
  deviceBreakdown: [],
  utmBreakdown: [],
  timeline: [],
  eventTimeline: null,
  financials: null,
  selectedEventSlug: null,
  startDate: null,
  endDate: null,
  loading: false,
  error: null,
};

export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ stats, events, selectedEventSlug, financials }) => ({
    hasData: computed(() => !!stats() && events().length > 0),
    topEvent: computed(() => {
      const evts = events();
      if (evts.length === 0) return null;
      return evts.reduce((a, b) => a.totalClicks > b.totalClicks ? a : b);
    }),
    businessStats: computed(() => {
      const fin = financials();
      if (!fin) return { caMonth: 0, caYear: 0, resultYear: 0 };
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const y = String(now.getFullYear());
      const sum = (rows: { amount: number; event_date: string }[], prefix: string) =>
        rows.filter(r => r.event_date.startsWith(prefix)).reduce((s, r) => s + r.amount, 0);
      const caYear = sum(fin.revenues, y);
      return {
        caMonth: sum(fin.revenues, ym),
        caYear,
        resultYear: caYear - sum(fin.charges, y),
      };
    }),
    perEventFinancials: computed(() => {
      const fin = financials();
      const rows = new Map<string, { name: string; date: string; ca: number; charges: number }>();
      events().forEach(e => rows.set(e.name, { name: e.name, date: e.date, ca: 0, charges: 0 }));
      const touch = (name: string, date: string) => {
        let e = rows.get(name);
        if (!e) {
          e = { name, date, ca: 0, charges: 0 };
          rows.set(name, e);
        }
        return e;
      };
      (fin?.revenues ?? []).forEach(r => { touch(r.event_name, r.event_date).ca += r.amount; });
      (fin?.charges ?? []).forEach(r => { touch(r.event_name, r.event_date).charges += r.amount; });
      return Array.from(rows.values())
        .map(e => ({ ...e, result: e.ca - e.charges }))
        .sort((a, b) => b.date.localeCompare(a.date));
    }),
    upcomingEvents: computed(() => {
      const today = new Date().toISOString().split('T')[0];
      return events()
        .filter(e => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3);
    }),
    upcomingCount: computed(() => {
      const today = new Date().toISOString().split('T')[0];
      return events().filter(e => e.date >= today).length;
    }),
    selectedEvent: computed(() => {
      const slug = selectedEventSlug();
      if (!slug) return null;
      return events().find(e => e.slug === slug) ?? null;
    }),
  })),
  withMethods((store, service = inject(DashboardService)) => ({
    async loadAll(params?: { eventSlug?: string; startDate?: string; endDate?: string; force?: boolean }) {
      // Skip re-fetch if data exists and no filter change (cache)
      const filtersChanged =
        params?.eventSlug !== undefined ||
        params?.startDate !== undefined ||
        params?.endDate !== undefined;
      if (!params?.force && !filtersChanged && store.stats() !== null) return;

      patchState(store, { loading: true, error: null });
      if (params?.eventSlug !== undefined) {
        patchState(store, { selectedEventSlug: params.eventSlug || null });
      }
      if (params?.startDate !== undefined || params?.endDate !== undefined) {
        patchState(store, {
          startDate: params?.startDate ?? null,
          endDate: params?.endDate ?? null,
        });
      }
      const slug = params?.eventSlug ?? store.selectedEventSlug() ?? undefined;
      const startDate = params?.startDate ?? store.startDate() ?? undefined;
      const endDate = params?.endDate ?? store.endDate() ?? undefined;
      try {
        // Fetch events first (optimized — no N+1)
        const events = await service.getEvents();

        // Then fetch stats + analytics in parallel, passing events to avoid redundant fetch
        const [stats, recentClicks, deviceBreakdown, utmBreakdown, timeline, financials] = await Promise.all([
          service.getStatsFromEvents(events, slug, startDate, endDate),
          service.getClicks(slug, startDate, endDate),
          service.getDeviceBreakdown(slug, startDate, endDate),
          service.getUtmBreakdown(slug, startDate, endDate),
          service.getTimeline(slug, startDate, endDate),
          service.getFinancials(),
        ]);
        // Build event-based timeline for stacked chart
        const eventTimeline = await service.getEventTimeline(events, slug, startDate, endDate);
        patchState(store, {
          events,
          stats,
          recentClicks: recentClicks.slice(0, 50),
          deviceBreakdown,
          utmBreakdown,
          timeline,
          eventTimeline,
          financials,
          loading: false,
        });
      } catch (e: any) {
        patchState(store, { loading: false, error: e.message ?? 'Erreur de chargement' });
      }
    },
    selectEvent(slug: string | null) {
      patchState(store, { selectedEventSlug: slug });
    },
    setDateRange(startDate: string | null, endDate: string | null) {
      patchState(store, { startDate, endDate });
    },
  }))
);
