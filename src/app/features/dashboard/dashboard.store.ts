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
  loading: false,
  error: null,
};

export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ stats, events }) => ({
    hasData: computed(() => !!stats() && events().length > 0),
    topEvent: computed(() => {
      const evts = events();
      if (evts.length === 0) return null;
      return evts.reduce((a, b) => a.totalClicks > b.totalClicks ? a : b);
    }),
  })),
  withMethods((store, service = inject(DashboardService)) => ({
    async loadAll() {
      patchState(store, { loading: true, error: null });
      try {
        const [events, stats, recentClicks, deviceBreakdown, utmBreakdown, timeline] = await Promise.all([
          service.getEvents(),
          service.getStats(),
          service.getClicks(),
          service.getDeviceBreakdown(),
          service.getUtmBreakdown(),
          service.getTimeline(),
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
  }))
);
