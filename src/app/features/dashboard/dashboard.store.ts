import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { DashboardService } from './dashboard.service';
import { EventConfig, ClickRecord, DeviceBreakdown, UtmBreakdown, TimelinePoint, DashboardStats, EventTimelineData } from './dashboard.model';

interface DashboardState {
  events: EventConfig[];
  stats: DashboardStats | null;
  recentClicks: ClickRecord[];
  deviceBreakdown: DeviceBreakdown[];
  utmBreakdown: UtmBreakdown[];
  timeline: TimelinePoint[];
  eventTimeline: EventTimelineData | null;
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
  selectedEventSlug: null,
  startDate: null,
  endDate: null,
  loading: false,
  error: null,
};

export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ stats, events, selectedEventSlug }) => ({
    hasData: computed(() => !!stats() && events().length > 0),
    topEvent: computed(() => {
      const evts = events();
      if (evts.length === 0) return null;
      return evts.reduce((a, b) => a.totalClicks > b.totalClicks ? a : b);
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
        const [stats, recentClicks, deviceBreakdown, utmBreakdown, timeline] = await Promise.all([
          service.getStatsFromEvents(events, slug, startDate, endDate),
          service.getClicks(slug, startDate, endDate),
          service.getDeviceBreakdown(slug, startDate, endDate),
          service.getUtmBreakdown(slug, startDate, endDate),
          service.getTimeline(slug, startDate, endDate),
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
