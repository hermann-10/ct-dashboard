import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { EventsAdminService } from './events-admin.service';
import { EventRecord, CreateEventDto, UpdateEventDto } from './events-admin.model';

interface EventsAdminState {
  events: EventRecord[];
  loading: boolean;
  error: string | null;
}

const initialState: EventsAdminState = {
  events: [],
  loading: false,
  error: null,
};

export const EventsAdminStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((state) => ({
    publishedCount: computed(() => state.events().filter(e => e.is_published).length),
    upcomingCount: computed(() => {
      const today = new Date().toISOString().split('T')[0];
      return state.events().filter(e => e.date >= today).length;
    }),
  })),
  withMethods((store, service = inject(EventsAdminService)) => ({
    async loadAll() {
      patchState(store, { loading: true, error: null });
      try {
        const events = await service.getAll();
        patchState(store, { events, loading: false });
      } catch (e: any) {
        patchState(store, { loading: false, error: e.message });
      }
    },
    async create(dto: CreateEventDto) {
      patchState(store, { loading: true, error: null });
      try {
        const created = await service.create(dto);
        patchState(store, { events: [...store.events(), created], loading: false });
      } catch (e: any) {
        patchState(store, { loading: false, error: e.message });
      }
    },
    async update(id: string, dto: UpdateEventDto) {
      patchState(store, { loading: true, error: null });
      try {
        const updated = await service.update(id, dto);
        patchState(store, {
          events: store.events().map(e => e.id === id ? updated : e),
          loading: false,
        });
      } catch (e: any) {
        patchState(store, { loading: false, error: e.message });
      }
    },
    async remove(id: string) {
      patchState(store, { loading: true, error: null });
      try {
        await service.delete(id);
        patchState(store, {
          events: store.events().filter(e => e.id !== id),
          loading: false,
        });
      } catch (e: any) {
        patchState(store, { loading: false, error: e.message });
      }
    },
    async togglePublished(id: string) {
      const event = store.events().find(e => e.id === id);
      if (!event) return;
      try {
        const updated = await service.togglePublished(id, !event.is_published);
        patchState(store, {
          events: store.events().map(e => e.id === id ? updated : e),
        });
      } catch (e: any) {
        patchState(store, { error: e.message });
      }
    },
  }))
);
