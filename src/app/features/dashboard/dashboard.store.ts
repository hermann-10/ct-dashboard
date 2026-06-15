import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { DashboardService } from './dashboard.service';
import { EventConfig, ClickRecord, DeviceBreakdown, UtmBreakdown, TimelinePoint, DashboardStats } from './dashboard.model';

interface DashboardState {
  events: EventConfig[];
  stats: DashboardStats | null;
  recentClicks: ClickRecord[];
  deviceBreakdown: DeviceBreakdown[];
  utmBreakdown: UtmBreakdown[];
  timeline: TimelinePoint[];
  selectedEventSlug: string | null;
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
  selectedEventSlug: null,
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
    async loadAll(eventSlug?: string) {
      patchState(store, { loading: true, error: null });
      if (eventSlug !== undefined) {
        patchState(store, { selectedEventSlug: eventSlug });
      }
      const slug = eventSlug ?? store.selectedEventSlug() ?? undefined;
      try {
        const [events, stats, recentClicks, deviceBreakdown, utmBreakdown, timeline] = await Promise.all([
          service.getEvents(),
          service.getStats(slug),
          service.getClicks(slug),
          service.getDeviceBreakdown(slug),
          service.getUtmBreakdown(slug),
          service.getTimeline(slug),
        ]);
        patchState(store, {
          events,
          stats,
          recentClicks: recentClicks.slice(0, 50),
          deviceBreakdown,
          utmBreakdown,
          timeline,
          loading: false,
        });
      } catch (e: any) {
        patchState(store, { loading: false, error: e.message ?? 'Erreur de chargement' });
      }
    },
    selectEvent(slug: string | null) {
      patchState(store, { selectedEventSlug: slug });
    },
  }))
);
