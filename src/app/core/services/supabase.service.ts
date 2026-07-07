import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        // Bypass the Web Locks API to prevent deadlocks in Supabase JS v2.
        // The navigator.locks-based lock can stall indefinitely when the
        // stored session is expired and needs refreshing during initialisation.
        lock: async <R>(
          _name: string,
          _acquireTimeout: number,
          fn: () => Promise<R>,
        ): Promise<R> => await fn(),
      },
    });
  }

  // ─────────────────────────────────────────────────────────
  // Direct REST helper — bypasses the Supabase JS PostgREST
  // client which can hang on mutations in zoneless Angular.
  // Reads still go through the Supabase client (they work).
  // ─────────────────────────────────────────────────────────
  private async _rest<T = any>(
    method: 'POST' | 'PATCH' | 'DELETE',
    table: string,
    body?: Record<string, any>,
    queryParams?: string,
  ): Promise<T> {
    const { data: sessionData } = await this.supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token ?? '';

    const url = `${environment.supabaseUrl}/rest/v1/${table}${queryParams ? `?${queryParams}` : ''}`;

    const headers: Record<string, string> = {
      'apikey': environment.supabaseAnonKey,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };

    // For POST/PATCH we want a single object back (equivalent to .single())
    if (method !== 'DELETE') {
      headers['Accept'] = 'application/vnd.pgrst.object+json';
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || err.details || `REST ${method} ${table} failed: ${res.status}`);
    }

    if (method === 'DELETE') return undefined as T;
    return res.json() as Promise<T>;
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    return { user: data?.user ?? null, error: error as Error | null };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  async signUp(email: string, password: string, fullName: string): Promise<{ user: User | null; error: Error | null }> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { user: data?.user ?? null, error: error as Error | null };
  }

  async resetPassword(email: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error: error as Error | null };
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  /** Get the current authenticated user's ID */
  async getCurrentUserId(): Promise<string | null> {
    const { data } = await this.supabase.auth.getUser();
    return data.user?.id ?? null;
  }

  // ── Profiles ──
  async getProfile(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  }

  async updateProfile(userId: string, changes: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getProfiles(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  // ── Email: Send QR code to guest ──
  async sendGuestQrEmail(payload: {
    guest_name: string;
    guest_email: string;
    checkin_token: string;
    event_name: string;
    event_date: string;
    event_venue: string;
    event_city: string;
    artist_name: string;
    event_image_url?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.functions.invoke('send-guestlist-qr', {
        body: payload,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message ?? 'Erreur d\'envoi' };
    }
  }

  // Dashboard queries
  async getClicks(filters?: { eventSlug?: string; startDate?: string; endDate?: string }) {
    let query = this.supabase.from('clicks').select('*').order('created_at', { ascending: false });
    if (filters?.eventSlug) query = query.eq('event_slug', filters.eventSlug);
    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getClicksCount(eventSlug?: string, startDate?: string, endDate?: string): Promise<number> {
    let query = this.supabase.from('clicks').select('*', { count: 'exact', head: true });
    if (eventSlug) query = query.eq('event_slug', eventSlug);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    const { count } = await query;
    return count ?? 0;
  }

  async getUniqueVisitors(eventSlug?: string, startDate?: string, endDate?: string): Promise<number> {
    let query = this.supabase.from('clicks').select('ip_hash');
    if (eventSlug) query = query.eq('event_slug', eventSlug);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    const { data } = await query;
    return new Set((data ?? []).map(d => d.ip_hash)).size;
  }

  async getDeviceBreakdown(eventSlug?: string, startDate?: string, endDate?: string) {
    let query = this.supabase.from('clicks').select('device');
    if (eventSlug) query = query.eq('event_slug', eventSlug);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    const { data } = await query;
    const counts: Record<string, number> = {};
    (data ?? []).forEach(d => { counts[d.device] = (counts[d.device] || 0) + 1; });
    return Object.entries(counts).map(([device, count]) => ({ device, count }));
  }

  async getUtmBreakdown(eventSlug?: string, startDate?: string, endDate?: string) {
    let query = this.supabase.from('clicks').select('utm_source, utm_medium, utm_campaign');
    if (eventSlug) query = query.eq('event_slug', eventSlug);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    const { data } = await query;
    const sources: Record<string, number> = {};
    (data ?? []).forEach(d => {
      const key = d.utm_source || 'direct';
      sources[key] = (sources[key] || 0) + 1;
    });
    return Object.entries(sources).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
  }

  async getClicksTimeline(eventSlug?: string, startDate?: string, endDate?: string) {
    let query = this.supabase.from('clicks').select('created_at, event_slug');
    if (eventSlug) query = query.eq('event_slug', eventSlug);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    query = query.order('created_at', { ascending: true });
    const { data } = await query;
    const byDay: Record<string, number> = {};
    const byDayEvent: Record<string, Record<string, number>> = {};
    (data ?? []).forEach(d => {
      const day = d.created_at.substring(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
      if (!byDayEvent[day]) byDayEvent[day] = {};
      const slug = d.event_slug || 'unknown';
      byDayEvent[day][slug] = (byDayEvent[day][slug] || 0) + 1;
    });

    // Fill missing dates so the chart draws a continuous line
    const days = Object.keys(byDay).sort();
    if (days.length === 0) return [];

    const today = new Date().toISOString().substring(0, 10);
    // Always show at least 7 days so a single data point still renders a curve
    const minStart = new Date();
    minStart.setDate(minStart.getDate() - 6);
    const minStartIso = minStart.toISOString().substring(0, 10);

    const autoStart = days[0] < minStartIso ? days[0] : minStartIso;
    const rangeStart = startDate ? startDate.substring(0, 10) : autoStart;
    const rangeEnd = endDate ? endDate.substring(0, 10) : today;

    const result: { date: string; count: number; byEvent: Record<string, number> }[] = [];
    const cursor = new Date(rangeStart);
    const end = new Date(rangeEnd);
    while (cursor <= end) {
      const iso = cursor.toISOString().substring(0, 10);
      result.push({
        date: iso,
        count: byDay[iso] ?? 0,
        byEvent: byDayEvent[iso] ?? {},
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }

  // Events CRUD
  async getEvents(publishedOnly = false): Promise<any[]> {
    let query = this.supabase.from('events').select('*').order('date', { ascending: true });
    if (publishedOnly) query = query.eq('is_published', true);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getUpcomingEvents(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('is_published', true)
      .gte('date', today)
      .order('date', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getPastEvents(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('is_published', true)
      .lt('date', today)
      .order('date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createEvent(event: any): Promise<any> {
    return this._rest('POST', 'events', event);
  }

  async updateEvent(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'events', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteEvent(id: string): Promise<void> {
    await this._rest('DELETE', 'events', undefined, `id=eq.${id}`);
  }

  async toggleEventPublished(id: string, isPublished: boolean): Promise<any> {
    return this.updateEvent(id, { is_published: isPublished });
  }

  // Storage - upload flyer
  async uploadFlyer(file: File, slug: string): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${slug}-${Date.now()}.${ext}`;
    const { error } = await this.supabase.storage
      .from('event-flyers')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = this.supabase.storage.from('event-flyers').getPublicUrl(path);
    return data.publicUrl;
  }

  // Storage - upload artist photo
  async uploadArtistPhoto(file: File, artistName: string): Promise<string> {
    const slug = artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${slug}-${Date.now()}.${ext}`;
    const { error } = await this.supabase.storage
      .from('artist-photos')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = this.supabase.storage.from('artist-photos').getPublicUrl(path);
    return data.publicUrl;
  }

  // ── Event Charges CRUD ──
  async getEventCharges(eventId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('event_charges')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createEventCharge(charge: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('event_charges')
      .insert(charge)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateEventCharge(id: string, changes: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('event_charges')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteEventCharge(id: string): Promise<void> {
    const { error } = await this.supabase.from('event_charges').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Event Revenues CRUD ──
  async getEventRevenues(eventId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('event_revenues')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createEventRevenue(revenue: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('event_revenues')
      .insert(revenue)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateEventRevenue(id: string, changes: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('event_revenues')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteEventRevenue(id: string): Promise<void> {
    const { error } = await this.supabase.from('event_revenues').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Event Lineup CRUD ──
  async getEventLineup(eventId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('event_lineup')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createEventLineupEntry(entry: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('event_lineup')
      .insert(entry)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateEventLineupEntry(id: string, changes: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('event_lineup')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteEventLineupEntry(id: string): Promise<void> {
    const { error } = await this.supabase.from('event_lineup').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Event notes/strategy ──
  async getEventById(id: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async getEventBySlug(slug: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) throw error;
    return data;
  }

  async updateEventNotes(id: string, notes: string | null, strategy: string | null): Promise<any> {
    const { data, error } = await this.supabase
      .from('events')
      .update({ notes, strategy, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteFlyer(url: string): Promise<void> {
    const path = url.split('/event-flyers/')[1];
    if (path) {
      await this.supabase.storage.from('event-flyers').remove([path]);
    }
  }

  // Extract og:image from a ticketing URL via serverless function
  async extractOgImage(ticketUrl: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/og-image?url=${encodeURIComponent(ticketUrl)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.image_url ?? null;
    } catch {
      return null;
    }
  }

  // Settings
  async getSetting(key: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    return data?.value ?? null;
  }

  async getSettings(): Promise<Record<string, string>> {
    const { data } = await this.supabase.from('settings').select('key, value');
    const result: Record<string, string> = {};
    (data ?? []).forEach(row => { result[row.key] = row.value; });
    return result;
  }

  async upsertSetting(key: string, value: string): Promise<void> {
    const { error } = await this.supabase
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
  }

  async deleteSetting(key: string): Promise<void> {
    await this.supabase.from('settings').delete().eq('key', key);
  }

  // ── Guestlists ──
  async getEventGuestlists(eventId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('event_guestlists')
      .select('*, entries:guestlist_entries(*)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    // Sort entries within each guestlist by guest_name
    return (data ?? []).map((gl: any) => ({
      ...gl,
      entries: (gl.entries ?? []).sort((a: any, b: any) =>
        (a.guest_name ?? '').localeCompare(b.guest_name ?? '', 'fr')
      ),
    }));
  }

  async createEventGuestlist(dto: { event_id: string; lineup_id?: string | null; artist_name: string; quota?: number }): Promise<any> {
    const { data, error } = await this.supabase
      .from('event_guestlists')
      .insert({
        event_id: dto.event_id,
        lineup_id: dto.lineup_id ?? null,
        artist_name: dto.artist_name,
        quota: dto.quota ?? 10,
      })
      .select()
      .single();
    if (error) throw error;
    return { ...data, entries: [] };
  }

  async updateEventGuestlist(id: string, changes: { artist_name?: string; quota?: number }): Promise<any> {
    const { data, error } = await this.supabase
      .from('event_guestlists')
      .update(changes)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteEventGuestlist(id: string): Promise<void> {
    const { error } = await this.supabase.from('event_guestlists').delete().eq('id', id);
    if (error) throw error;
  }

  async createGuestlistEntry(dto: { guestlist_id: string; guest_name: string; email?: string; accompagnants?: number; remarks?: string }): Promise<any> {
    const { data, error } = await this.supabase
      .from('guestlist_entries')
      .insert({
        guestlist_id: dto.guestlist_id,
        guest_name: dto.guest_name,
        email: dto.email ?? null,
        accompagnants: dto.accompagnants ?? 0,
        remarks: dto.remarks ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateGuestlistEntry(id: string, changes: Partial<{ guest_name: string; accompagnants: number; remarks: string | null; is_checked_in: boolean }>): Promise<any> {
    const { data, error } = await this.supabase
      .from('guestlist_entries')
      .update(changes)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async toggleDoorCheckin(entryId: string, isCheckedIn: boolean): Promise<{ checked_in_at: string | null }> {
    const checkedInAt = isCheckedIn ? new Date().toISOString() : null;
    const { error } = await this.supabase
      .from('guestlist_entries')
      .update({ is_checked_in: isCheckedIn, checked_in_at: checkedInAt })
      .eq('id', entryId);
    if (error) throw error;
    return { checked_in_at: checkedInAt };
  }

  async deleteGuestlistEntry(id: string): Promise<void> {
    const { error } = await this.supabase.from('guestlist_entries').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Public Guestlist (by share_token) ──
  async getGuestlistByToken(token: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('event_guestlists')
      .select('*, event:events(name, date, venue, city, image_url), entries:guestlist_entries(*)')
      .eq('share_token', token)
      .single();
    if (error) throw error;
    return {
      ...data,
      entries: (data.entries ?? []).sort((a: any, b: any) =>
        (a.guest_name ?? '').localeCompare(b.guest_name ?? '', 'fr')
      ),
    };
  }

  // ── Door (consolidated guestlists by event slug) ──
  async getEventGuestlistsBySlug(slug: string): Promise<any> {
    // Get event by slug
    const { data: event, error: eventErr } = await this.supabase
      .from('events')
      .select('id, name, date, venue, city, image_url')
      .eq('slug', slug)
      .single();
    if (eventErr) throw eventErr;

    // Get all guestlists for this event with entries
    const { data: guestlists, error: glErr } = await this.supabase
      .from('event_guestlists')
      .select('id, artist_name, quota, entries:guestlist_entries(*)')
      .eq('event_id', event.id)
      .order('artist_name');
    if (glErr) throw glErr;

    return {
      event,
      guestlists: (guestlists ?? []).map((gl: any) => ({
        ...gl,
        entries: (gl.entries ?? []).sort((a: any, b: any) =>
          (a.guest_name ?? '').localeCompare(b.guest_name ?? '', 'fr')
        ),
      })),
    };
  }

  // ── Check-in ──
  async checkinByToken(checkinToken: string): Promise<{ entry: any; artistName: string } | null> {
    // Find entry by checkin_token with parent guestlist info
    const { data, error } = await this.supabase
      .from('guestlist_entries')
      .select('*, guestlist:event_guestlists(artist_name)')
      .eq('checkin_token', checkinToken)
      .single();
    if (error || !data) return null;

    // Mark as checked in
    await this.supabase
      .from('guestlist_entries')
      .update({ is_checked_in: true })
      .eq('id', data.id);

    return { entry: { ...data, is_checked_in: true }, artistName: (data as any).guestlist?.artist_name ?? '' };
  }

  // ── Notifications ──
  async getNotifications(unreadOnly = false): Promise<any[]> {
    let query = this.supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    if (unreadOnly) query = query.eq('is_read', false);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getUnreadCount(): Promise<number> {
    const { count } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    return count ?? 0;
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
  }

  async deleteNotification(id: string): Promise<void> {
    await this.supabase.from('notifications').delete().eq('id', id);
  }

  // ── Notification Rules ──
  async getNotificationRules(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('notification_rules')
      .select('*, events!notification_rules_event_id_fkey(name, slug)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createNotificationRule(rule: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('notification_rules')
      .insert(rule)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateNotificationRule(id: string, changes: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('notification_rules')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteNotificationRule(id: string): Promise<void> {
    await this.supabase.from('notification_rules').delete().eq('id', id);
  }

  // ── Artists CRM ──
  // ── Products / Bar ──
  async getProducts(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createProduct(product: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateProduct(id: string, changes: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('products')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await this.supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  async getEventSales(eventId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('event_sales')
      .select('*, product:products(*)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async upsertEventSale(sale: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('event_sales')
      .upsert(sale, { onConflict: 'event_id,product_id' })
      .select('*, product:products(*)')
      .single();
    if (error) throw error;
    return data;
  }

  async deleteEventSale(id: string): Promise<void> {
    const { error } = await this.supabase.from('event_sales').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Artists CRM ──
  async getArtists(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('artists')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getArtistById(id: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('artists')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async createArtist(artist: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('artists')
      .insert(artist)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateArtist(id: string, changes: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('artists')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteArtist(id: string): Promise<void> {
    const { error } = await this.supabase.from('artists').delete().eq('id', id);
    if (error) throw error;
  }

  async getArtistBookings(artistId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('event_lineup')
      .select('*, event:events(name, date, venue, city, slug)')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  // ── Newsletter Contacts ──
  async getNewsletterContacts(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('newsletter_contacts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createNewsletterContact(contact: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('newsletter_contacts')
      .insert(contact)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async createNewsletterContactsBulk(contacts: any[]): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('newsletter_contacts')
      .upsert(contacts, { onConflict: 'email', ignoreDuplicates: true })
      .select();
    if (error) throw error;
    return data ?? [];
  }

  async updateNewsletterContact(id: string, changes: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('newsletter_contacts')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteNewsletterContact(id: string): Promise<void> {
    const { error } = await this.supabase.from('newsletter_contacts').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Newsletters ──
  async getNewsletters(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('newsletters')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createNewsletter(newsletter: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('newsletters')
      .insert(newsletter)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateNewsletter(id: string, changes: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('newsletters')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteNewsletter(id: string): Promise<void> {
    const { error } = await this.supabase.from('newsletters').delete().eq('id', id);
    if (error) throw error;
  }
}
