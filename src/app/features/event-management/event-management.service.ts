import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import {
  EventCharge, EventRevenue, EventLineup, ManagedEvent,
  EventGuestlist, GuestlistEntry,
  CreateChargeDto, CreateRevenueDto, CreateLineupDto,
  CreateGuestlistDto, CreateGuestEntryDto,
} from './event-management.model';

@Injectable({ providedIn: 'root' })
export class EventManagementService {
  private readonly supabase = inject(SupabaseService);

  // ── Event ──
  async getEventBySlug(slug: string): Promise<ManagedEvent> {
    return this.supabase.getEventBySlug(slug);
  }

  async updateEventNotes(id: string, notes: string | null, strategy: string | null): Promise<ManagedEvent> {
    return this.supabase.updateEventNotes(id, notes, strategy);
  }

  // ── Charges ──
  async getCharges(eventId: string): Promise<EventCharge[]> {
    return this.supabase.getEventCharges(eventId);
  }

  async createCharge(dto: CreateChargeDto): Promise<EventCharge> {
    return this.supabase.createEventCharge(dto);
  }

  async updateCharge(id: string, changes: Partial<EventCharge>): Promise<EventCharge> {
    return this.supabase.updateEventCharge(id, changes);
  }

  async deleteCharge(id: string): Promise<void> {
    return this.supabase.deleteEventCharge(id);
  }

  // ── Revenues ──
  async getRevenues(eventId: string): Promise<EventRevenue[]> {
    return this.supabase.getEventRevenues(eventId);
  }

  async createRevenue(dto: CreateRevenueDto): Promise<EventRevenue> {
    return this.supabase.createEventRevenue(dto);
  }

  async updateRevenue(id: string, changes: Partial<EventRevenue>): Promise<EventRevenue> {
    return this.supabase.updateEventRevenue(id, changes);
  }

  async deleteRevenue(id: string): Promise<void> {
    return this.supabase.deleteEventRevenue(id);
  }

  // ── Lineup ──
  async getLineup(eventId: string): Promise<EventLineup[]> {
    return this.supabase.getEventLineup(eventId);
  }

  async createLineupEntry(dto: CreateLineupDto): Promise<EventLineup> {
    return this.supabase.createEventLineupEntry(dto);
  }

  async updateLineupEntry(id: string, changes: Partial<EventLineup>): Promise<EventLineup> {
    return this.supabase.updateEventLineupEntry(id, changes);
  }

  async deleteLineupEntry(id: string): Promise<void> {
    return this.supabase.deleteEventLineupEntry(id);
  }

  // ── Guestlists ──
  async getGuestlists(eventId: string): Promise<EventGuestlist[]> {
    return this.supabase.getEventGuestlists(eventId);
  }

  async createGuestlist(dto: CreateGuestlistDto): Promise<EventGuestlist> {
    return this.supabase.createEventGuestlist(dto);
  }

  async updateGuestlist(id: string, changes: { artist_name?: string; quota?: number }): Promise<EventGuestlist> {
    return this.supabase.updateEventGuestlist(id, changes);
  }

  async deleteGuestlist(id: string): Promise<void> {
    return this.supabase.deleteEventGuestlist(id);
  }

  async createGuestEntry(dto: CreateGuestEntryDto): Promise<GuestlistEntry> {
    return this.supabase.createGuestlistEntry(dto);
  }

  async updateGuestEntry(id: string, changes: Partial<GuestlistEntry>): Promise<GuestlistEntry> {
    return this.supabase.updateGuestlistEntry(id, changes);
  }

  async deleteGuestEntry(id: string): Promise<void> {
    return this.supabase.deleteGuestlistEntry(id);
  }
}
