import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { EventManagementService } from './event-management.service';
import {
  EventCharge, EventRevenue, EventLineup, ManagedEvent, BudgetSummary,
  EventGuestlist, GuestlistEntry, GuestlistSummary,
  CreateChargeDto, CreateRevenueDto, CreateLineupDto,
  CreateGuestlistDto, CreateGuestEntryDto,
} from './event-management.model';

interface EventManagementState {
  event: ManagedEvent | null;
  charges: EventCharge[];
  revenues: EventRevenue[];
  lineup: EventLineup[];
  guestlists: EventGuestlist[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: EventManagementState = {
  event: null,
  charges: [],
  revenues: [],
  lineup: [],
  guestlists: [],
  loading: false,
  saving: false,
  error: null,
};

export const EventManagementStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ charges, revenues, lineup, guestlists }) => ({
    budget: computed<BudgetSummary>(() => {
      const ch = charges();
      const rev = revenues();
      const totalCharges = ch.reduce((sum, c) => sum + Number(c.amount), 0);
      const totalRevenues = rev.reduce((sum, r) => sum + Number(r.amount), 0);
      return {
        totalCharges,
        totalRevenues,
        profit: totalRevenues - totalCharges,
        chargesPaid: ch.filter(c => c.is_paid).reduce((s, c) => s + Number(c.amount), 0),
        chargesUnpaid: ch.filter(c => !c.is_paid).reduce((s, c) => s + Number(c.amount), 0),
        revenuesReceived: rev.filter(r => r.is_received).reduce((s, r) => s + Number(r.amount), 0),
        revenuesPending: rev.filter(r => !r.is_received).reduce((s, r) => s + Number(r.amount), 0),
      };
    }),
    confirmedArtists: computed(() => lineup().filter(a => a.is_confirmed).length),
    totalArtists: computed(() => lineup().length),
    totalLineupFees: computed(() => lineup().reduce((sum, a) => sum + Number(a.fee ?? 0), 0)),
    guestlistSummary: computed<GuestlistSummary>(() => {
      const gls = guestlists();
      const allEntries = gls.flatMap(gl => gl.entries ?? []);
      return {
        totalGuestlists: gls.length,
        totalGuests: allEntries.length + allEntries.reduce((s, e) => s + (e.accompagnants ?? 0), 0),
        totalCheckedIn: allEntries.filter(e => e.is_checked_in).length,
        totalCapacity: gls.reduce((s, gl) => s + gl.quota, 0),
      };
    }),
  })),
  withMethods((store, service = inject(EventManagementService)) => ({
    // ── Load all data for an event ──
    async loadEvent(slugOrId: string) {
      patchState(store, { loading: true, error: null });
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
        const event = isUuid
          ? await service.getEventById(slugOrId)
          : await service.getEventBySlug(slugOrId);
        const [charges, revenues, lineup, guestlists] = await Promise.all([
          service.getCharges(event.id),
          service.getRevenues(event.id),
          service.getLineup(event.id),
          service.getGuestlists(event.id),
        ]);
        patchState(store, { event, charges, revenues, lineup, guestlists, loading: false });
      } catch (e: any) {
        patchState(store, { loading: false, error: e.message ?? 'Erreur de chargement' });
      }
    },

    // ── Charges ──
    async addCharge(dto: CreateChargeDto) {
      patchState(store, { saving: true });
      try {
        const created = await service.createCharge(dto);
        patchState(store, { charges: [...store.charges(), created], saving: false });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async editCharge(id: string, changes: Partial<EventCharge>) {
      patchState(store, { saving: true });
      try {
        const updated = await service.updateCharge(id, changes);
        patchState(store, {
          charges: store.charges().map(c => c.id === id ? updated : c),
          saving: false,
        });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async removeCharge(id: string) {
      patchState(store, { saving: true });
      try {
        await service.deleteCharge(id);
        patchState(store, { charges: store.charges().filter(c => c.id !== id), saving: false });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async toggleChargePaid(id: string) {
      const charge = store.charges().find(c => c.id === id);
      if (!charge) return;
      const changes: Partial<EventCharge> = {
        is_paid: !charge.is_paid,
        paid_at: !charge.is_paid ? new Date().toISOString() : null,
      };
      patchState(store, { saving: true });
      try {
        const updated = await service.updateCharge(id, changes);
        patchState(store, {
          charges: store.charges().map(c => c.id === id ? updated : c),
          saving: false,
        });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },

    // ── Revenues ──
    async addRevenue(dto: CreateRevenueDto) {
      patchState(store, { saving: true });
      try {
        const created = await service.createRevenue(dto);
        patchState(store, { revenues: [...store.revenues(), created], saving: false });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async editRevenue(id: string, changes: Partial<EventRevenue>) {
      patchState(store, { saving: true });
      try {
        const updated = await service.updateRevenue(id, changes);
        patchState(store, {
          revenues: store.revenues().map(r => r.id === id ? updated : r),
          saving: false,
        });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async removeRevenue(id: string) {
      patchState(store, { saving: true });
      try {
        await service.deleteRevenue(id);
        patchState(store, { revenues: store.revenues().filter(r => r.id !== id), saving: false });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async toggleRevenueReceived(id: string) {
      const rev = store.revenues().find(r => r.id === id);
      if (!rev) return;
      patchState(store, { saving: true });
      try {
        const updated = await service.updateRevenue(id, { is_received: !rev.is_received });
        patchState(store, {
          revenues: store.revenues().map(r => r.id === id ? updated : r),
          saving: false,
        });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },

    // ── Lineup ──
    async addLineupEntry(dto: CreateLineupDto) {
      patchState(store, { saving: true });
      try {
        const created = await service.createLineupEntry(dto);
        patchState(store, { lineup: [...store.lineup(), created], saving: false });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async editLineupEntry(id: string, changes: Partial<EventLineup>) {
      patchState(store, { saving: true });
      try {
        const updated = await service.updateLineupEntry(id, changes);
        patchState(store, {
          lineup: store.lineup().map(a => a.id === id ? updated : a),
          saving: false,
        });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async removeLineupEntry(id: string) {
      patchState(store, { saving: true });
      try {
        await service.deleteLineupEntry(id);
        patchState(store, { lineup: store.lineup().filter(a => a.id !== id), saving: false });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async toggleLineupConfirmed(id: string) {
      const artist = store.lineup().find(a => a.id === id);
      if (!artist) return;
      patchState(store, { saving: true });
      try {
        const updated = await service.updateLineupEntry(id, { is_confirmed: !artist.is_confirmed });
        patchState(store, {
          lineup: store.lineup().map(a => a.id === id ? updated : a),
          saving: false,
        });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },

    // ── Notes & Strategy ──
    async saveNotes(notes: string | null, strategy: string | null) {
      const event = store.event();
      if (!event) return;
      patchState(store, { saving: true });
      try {
        const updated = await service.updateEventNotes(event.id, notes, strategy);
        patchState(store, { event: { ...event, notes: updated.notes, strategy: updated.strategy }, saving: false });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },

    // ── Guestlists ──
    async addGuestlist(dto: CreateGuestlistDto) {
      patchState(store, { saving: true });
      try {
        const created = await service.createGuestlist(dto);
        patchState(store, { guestlists: [...store.guestlists(), created], saving: false });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async editGuestlist(id: string, changes: { artist_name?: string; quota?: number }) {
      patchState(store, { saving: true });
      try {
        const updated = await service.updateGuestlist(id, changes);
        patchState(store, {
          guestlists: store.guestlists().map(gl =>
            gl.id === id ? { ...gl, ...updated } : gl
          ),
          saving: false,
        });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async removeGuestlist(id: string) {
      patchState(store, { saving: true });
      try {
        await service.deleteGuestlist(id);
        patchState(store, { guestlists: store.guestlists().filter(gl => gl.id !== id), saving: false });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async addGuestEntry(guestlistId: string, dto: CreateGuestEntryDto) {
      patchState(store, { saving: true });
      try {
        const entry = await service.createGuestEntry(dto);
        patchState(store, {
          guestlists: store.guestlists().map(gl =>
            gl.id === guestlistId
              ? { ...gl, entries: [...(gl.entries ?? []), entry].sort((a, b) => a.guest_name.localeCompare(b.guest_name, 'fr')) }
              : gl
          ),
          saving: false,
        });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async removeGuestEntry(guestlistId: string, entryId: string) {
      patchState(store, { saving: true });
      try {
        await service.deleteGuestEntry(entryId);
        patchState(store, {
          guestlists: store.guestlists().map(gl =>
            gl.id === guestlistId
              ? { ...gl, entries: (gl.entries ?? []).filter(e => e.id !== entryId) }
              : gl
          ),
          saving: false,
        });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
    async toggleGuestCheckedIn(guestlistId: string, entryId: string) {
      const gl = store.guestlists().find(g => g.id === guestlistId);
      const entry = gl?.entries?.find(e => e.id === entryId);
      if (!entry) return;
      patchState(store, { saving: true });
      try {
        const updated = await service.updateGuestEntry(entryId, { is_checked_in: !entry.is_checked_in });
        patchState(store, {
          guestlists: store.guestlists().map(g =>
            g.id === guestlistId
              ? { ...g, entries: (g.entries ?? []).map(e => e.id === entryId ? { ...e, ...updated } : e) }
              : g
          ),
          saving: false,
        });
      } catch (e: any) {
        patchState(store, { saving: false, error: e.message });
      }
    },
  }))
);
