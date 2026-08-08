import { Injectable, inject, ApplicationRef } from '@angular/core';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly appRef = inject(ApplicationRef);
  private readonly supabase: SupabaseClient;
  // Data-plane client: never touches supabase-js auth internals (which can
  // deadlock after login in zoneless Angular). Token comes from our cache.
  private readonly db: SupabaseClient;
  private _scheduleTick!: () => void;
  private _cachedAccessToken = '';

  constructor() {
    // ─────────────────────────────────────────────────────────
    // Zoneless Angular fix: Supabase uses native fetch() which
    // resolves outside Angular's change detection awareness.
    // We coalesce CD triggers so that parallel fetches (e.g.
    // dashboard loading 6+ queries at once) produce a SINGLE
    // change detection cycle instead of one per fetch.
    // ─────────────────────────────────────────────────────────
    const appRef = this.appRef;
    const nativeFetch = globalThis.fetch.bind(globalThis);

    // Coalesced CD scheduler — batches all tick requests into
    // one microtask, so N parallel fetches → 1 CD cycle.
    let tickScheduled = false;
    const scheduleTick = () => {
      if (!tickScheduled) {
        tickScheduled = true;
        queueMicrotask(() => {
          tickScheduled = false;
          appRef.tick();
        });
      }
    };
    this._scheduleTick = scheduleTick;

    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        // Pass-through lock (remplace le Web Locks API qui peut deadlocker).
        // supabase-js déduplique déjà les refreshs de token en interne ;
        // un mutex sérialisé ici mettait CHAQUE requête (lectures comprises)
        // en file d'attente derrière l'auth → pages lentes à chaque navigation.
        lock: async <R>(
          _name: string,
          _acquireTimeout: number,
          fn: () => Promise<R>,
        ): Promise<R> => fn(),
      },
      global: {
        fetch: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          // Add a 20s timeout when the caller has no abort signal, so a
          // hung request (auth refresh, read) fails instead of freezing.
          const patchedInit = init?.signal
            ? init
            : { ...init, signal: AbortSignal.timeout(20000) };
          const res = await nativeFetch(input, patchedInit);
          scheduleTick();
          return res;
        },
      },
    });

    // Cache the access token so REST helpers never depend on a
    // potentially-hanging getSession() call.
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this._cachedAccessToken = session?.access_token ?? '';
    });

    // Second client used for ALL data access (PostgREST, storage, functions).
    // `accessToken` bypasses supabase-js's internal getSession()/auth lock —
    // the historical cause of infinite "Chargement..." right after login.
    // The cached token is maintained by onAuthStateChange above (INITIAL_SESSION,
    // SIGNED_IN, TOKEN_REFRESHED) on the auth client.
    this.db = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      accessToken: async () => this._cachedAccessToken || environment.supabaseAnonKey,
      global: {
        fetch: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          const patchedInit = init?.signal
            ? init
            : { ...init, signal: AbortSignal.timeout(20000) };
          const res = await nativeFetch(input, patchedInit);
          scheduleTick();
          return res;
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────
  // Direct REST helper — bypasses the Supabase JS PostgREST
  // client which can hang on mutations in zoneless Angular.
  // Reads still go through the Supabase client (they work).
  // ─────────────────────────────────────────────────────────
  // getSession() can deadlock (supabase-js auth lock). Race it against a
  // short timeout and fall back to the cached token so requests never hang.
  private async _getAccessToken(): Promise<string> {
    try {
      const result = await Promise.race([
        this.supabase.auth.getSession(),
        new Promise<null>(resolve => setTimeout(resolve, 2500, null)),
      ]);
      const token = result?.data?.session?.access_token;
      if (token) {
        this._cachedAccessToken = token;
        return token;
      }
    } catch { /* fall back to cached token */ }
    return this._cachedAccessToken;
  }

  private async _rest<T = any>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    table: string,
    body?: Record<string, any> | Record<string, any>[],
    queryParams?: string,
    opts?: { resolution?: 'merge-duplicates' | 'ignore-duplicates'; expectArray?: boolean },
  ): Promise<T> {
    const accessToken = await this._getAccessToken();

    const url = `${environment.supabaseUrl}/rest/v1/${table}${queryParams ? `?${queryParams}` : ''}`;

    const headers: Record<string, string> = {
      'apikey': environment.supabaseAnonKey,
      // Fall back to the anon key when no session (public pages), same as supabase-js.
      'Authorization': `Bearer ${accessToken || environment.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': `return=representation${opts?.resolution ? `,resolution=${opts.resolution}` : ''}`,
    };

    // For POST/PATCH we want a single object back (equivalent to .single())
    if ((method === 'POST' || method === 'PATCH') && !opts?.expectArray) {
      headers['Accept'] = 'application/vnd.pgrst.object+json';
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });

    this._scheduleTick(); // trigger coalesced CD after direct fetch

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
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  }

  async updateProfile(userId: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'profiles', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${userId}`);
  }

  async getProfiles(): Promise<any[]> {
    const { data, error } = await this.db
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
      const { data, error } = await this.db.functions.invoke('send-guestlist-qr', {
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
    let query = this.db.from('clicks').select('*').order('created_at', { ascending: false });
    if (filters?.eventSlug) query = query.eq('event_slug', filters.eventSlug);
    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  /** Récupère TOUTES les lignes de clicks par pages de 1000 (Supabase plafonne chaque requête à 1000). */
  private async _allClickRows(columns: string, eventSlug?: string, startDate?: string, endDate?: string): Promise<any[]> {
    const page = 1000;
    const all: any[] = [];
    for (let from = 0; ; from += page) {
      let query = this.db
        .from('clicks')
        .select(columns)
        .order('created_at', { ascending: true })
        .range(from, from + page - 1);
      if (eventSlug) query = query.eq('event_slug', eventSlug);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as any[];
      all.push(...rows);
      if (rows.length < page) break;
    }
    return all;
  }

  async getClicksCount(eventSlug?: string, startDate?: string, endDate?: string): Promise<number> {
    let query = this.db.from('clicks').select('*', { count: 'exact', head: true });
    if (eventSlug) query = query.eq('event_slug', eventSlug);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    const { count } = await query;
    return count ?? 0;
  }

  async getUniqueVisitors(eventSlug?: string, startDate?: string, endDate?: string): Promise<number> {
    const rows = await this._allClickRows('ip_hash', eventSlug, startDate, endDate);
    return new Set(rows.map(d => d.ip_hash)).size;
  }

  async getDeviceBreakdown(eventSlug?: string, startDate?: string, endDate?: string) {
    const rows = await this._allClickRows('device', eventSlug, startDate, endDate);
    const counts: Record<string, number> = {};
    rows.forEach(d => { counts[d.device] = (counts[d.device] || 0) + 1; });
    return Object.entries(counts).map(([device, count]) => ({ device, count }));
  }

  async getUtmBreakdown(eventSlug?: string, startDate?: string, endDate?: string) {
    const rows = await this._allClickRows('utm_source, utm_medium, utm_campaign', eventSlug, startDate, endDate);
    const sources: Record<string, number> = {};
    rows.forEach(d => {
      const key = d.utm_source || 'direct';
      sources[key] = (sources[key] || 0) + 1;
    });
    return Object.entries(sources).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
  }

  async getClicksTimeline(eventSlug?: string, startDate?: string, endDate?: string) {
    const rows = await this._allClickRows('created_at, event_slug', eventSlug, startDate, endDate);
    const byDay: Record<string, number> = {};
    const byDayEvent: Record<string, Record<string, number>> = {};
    rows.forEach(d => {
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
    const params = ['select=*', 'order=date.asc'];
    if (publishedOnly) params.push('is_published=eq.true');
    return this._rest<any[]>('GET', 'events', undefined, params.join('&'));
  }

  async getUpcomingEvents(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.db
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
    const { data, error } = await this.db
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

  // ─────────────────────────────────────────────────────────
  // Direct Storage upload — bypasses the Supabase JS Storage
  // client which can hang on uploads in zoneless Angular.
  // ─────────────────────────────────────────────────────────
  private async _storageUpload(bucket: string, path: string, file: File): Promise<string> {
    const accessToken = await this._getAccessToken();

    const url = `${environment.supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': environment.supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: file,
    });

    this._scheduleTick(); // trigger coalesced CD after direct fetch

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.error || err.message || `Storage upload failed: ${res.status}`);
    }

    // Build the public URL directly
    return `${environment.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  }

  private async _storageDelete(bucket: string, paths: string[]): Promise<void> {
    const accessToken = await this._getAccessToken();

    const url = `${environment.supabaseUrl}/storage/v1/object/${bucket}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': environment.supabaseAnonKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: paths }),
    });

    this._scheduleTick(); // trigger coalesced CD after direct fetch

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.error || err.message || `Storage delete failed: ${res.status}`);
    }
  }

  // Storage - upload flyer
  async uploadFlyer(file: File, slug: string): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${slug}-${Date.now()}.${ext}`;
    return this._storageUpload('event-flyers', path, file);
  }

  // Storage - upload artist photo
  async uploadArtistPhoto(file: File, artistName: string): Promise<string> {
    const slug = artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${slug}-${Date.now()}.${ext}`;
    return this._storageUpload('artist-photos', path, file);
  }

  // ── Event Charges CRUD ──
  async getEventCharges(eventId: string): Promise<any[]> {
    const { data, error } = await this.db
      .from('event_charges')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createEventCharge(charge: any): Promise<any> {
    return this._rest('POST', 'event_charges', charge);
  }

  async updateEventCharge(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'event_charges', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteEventCharge(id: string): Promise<void> {
    await this._rest('DELETE', 'event_charges', undefined, `id=eq.${id}`);
  }

  /** Bulk fetch of all revenues + charges with their event date (dashboard CA). */
  async getEventFinancials(): Promise<{
    revenues: { amount: number; event_id: string; event_name: string; event_date: string }[];
    charges: { amount: number; event_id: string; event_name: string; event_date: string }[];
  }> {
    const [rev, ch] = await Promise.all([
      this.db.from('event_revenues').select('amount, event_id, event:events(name, date)'),
      this.db.from('event_charges').select('amount, event_id, event:events(name, date)'),
    ]);
    if (rev.error) throw rev.error;
    if (ch.error) throw ch.error;
    const mapRow = (r: any) => ({
      amount: Number(r.amount ?? 0),
      event_id: r.event_id ?? '',
      event_name: r.event?.name ?? '',
      event_date: r.event?.date ?? '',
    });
    return {
      revenues: (rev.data ?? []).map(mapRow),
      charges: (ch.data ?? []).map(mapRow),
    };
  }

  // ── Event Invoices CRUD ──
  async getEventInvoices(eventId: string): Promise<any[]> {
    const { data, error } = await this.db
      .from('event_invoices')
      .select('*')
      .eq('event_id', eventId)
      .order('invoice_number', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  /** Prochain numéro de facture — séquence unique avec les factures artiste. */
  // Via _rest GET : jeton en cache + timeout 15 s — ne peut pas bloquer
  // indéfiniment sur le verrou auth de supabase-js.
  private static readonly NEXT_NUM_QUERY = 'select=invoice_number&order=invoice_number.desc&limit=1';

  async getNextInvoiceNumber(): Promise<number> {
    const [a, b] = await Promise.all([
      this._rest<any[]>('GET', 'event_invoices', undefined, SupabaseService.NEXT_NUM_QUERY),
      this._rest<any[]>('GET', 'artist_invoices', undefined, SupabaseService.NEXT_NUM_QUERY).catch(() => [] as any[]),
    ]);
    const maxEvent = a?.[0]?.invoice_number ?? 0;
    const maxArtist = b?.[0]?.invoice_number ?? 0;
    return Math.max(maxEvent, maxArtist, 232) + 1;
  }

  async createEventInvoice(dto: any): Promise<any> {
    return this._rest('POST', 'event_invoices', dto);
  }

  async updateEventInvoice(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'event_invoices', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteEventInvoice(id: string): Promise<void> {
    await this._rest('DELETE', 'event_invoices', undefined, `id=eq.${id}`);
  }

  // ── Logistique / Inventaire (via _rest : jeton en cache + timeout 15 s) ──
  async getLogisticsItems(): Promise<any[]> {
    return this._rest<any[]>('GET', 'logistics_items', undefined, 'select=*,event:events(id,name,date)&order=name.asc');
  }

  async createLogisticsItem(dto: any): Promise<any> {
    return this._rest('POST', 'logistics_items', dto);
  }

  async updateLogisticsItem(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'logistics_items', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteLogisticsItem(id: string): Promise<void> {
    await this._rest('DELETE', 'logistics_items', undefined, `id=eq.${id}`);
  }

  // ── Event Staff CRUD (via _rest : jeton en cache + timeout 15 s) ──
  async getEventStaff(eventId: string): Promise<any[]> {
    return this._rest<any[]>('GET', 'event_staff', undefined, `select=*&event_id=eq.${eventId}&order=created_at.asc`);
  }

  async createEventStaff(dto: any): Promise<any> {
    return this._rest('POST', 'event_staff', dto);
  }

  async updateEventStaff(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'event_staff', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteEventStaff(id: string): Promise<void> {
    await this._rest('DELETE', 'event_staff', undefined, `id=eq.${id}`);
  }

  // ── Event Revenues CRUD ──
  async getEventRevenues(eventId: string): Promise<any[]> {
    const { data, error } = await this.db
      .from('event_revenues')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createEventRevenue(revenue: any): Promise<any> {
    return this._rest('POST', 'event_revenues', revenue);
  }

  async updateEventRevenue(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'event_revenues', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteEventRevenue(id: string): Promise<void> {
    await this._rest('DELETE', 'event_revenues', undefined, `id=eq.${id}`);
  }

  // ── Event Lineup CRUD ──
  async getEventLineup(eventId: string): Promise<any[]> {
    const { data, error } = await this.db
      .from('event_lineup')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createEventLineupEntry(entry: any): Promise<any> {
    return this._rest('POST', 'event_lineup', entry);
  }

  async updateEventLineupEntry(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'event_lineup', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteEventLineupEntry(id: string): Promise<void> {
    await this._rest('DELETE', 'event_lineup', undefined, `id=eq.${id}`);
  }

  // ── Event notes/strategy ──
  async getEventById(id: string): Promise<any> {
    const { data, error } = await this.db
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async getEventBySlug(slug: string): Promise<any> {
    const { data, error } = await this.db
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) throw error;
    return data;
  }

  async updateEventNotes(id: string, notes: string | null, strategy: string | null): Promise<any> {
    return this._rest('PATCH', 'events', { notes, strategy, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteFlyer(url: string): Promise<void> {
    const path = url.split('/event-flyers/')[1];
    if (path) {
      await this._storageDelete('event-flyers', [path]);
    }
  }

  // Extract og:image from a ticketing URL via serverless function
  async extractOgImage(ticketUrl: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/og-image?url=${encodeURIComponent(ticketUrl)}`);
      this._scheduleTick(); // trigger coalesced CD after direct fetch
      if (!res.ok) return null;
      const data = await res.json();
      return data.image_url ?? null;
    } catch {
      return null;
    }
  }

  // Settings
  async getSetting(key: string): Promise<string | null> {
    const { data } = await this.db
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    return data?.value ?? null;
  }

  async getSettings(): Promise<Record<string, string>> {
    const { data } = await this.db.from('settings').select('key, value');
    const result: Record<string, string> = {};
    (data ?? []).forEach(row => { result[row.key] = row.value; });
    return result;
  }

  async upsertSetting(key: string, value: string): Promise<void> {
    await this._rest('POST', 'settings', { key, value, updated_at: new Date().toISOString() }, 'on_conflict=key', { resolution: 'merge-duplicates' });
  }

  async deleteSetting(key: string): Promise<void> {
    await this._rest('DELETE', 'settings', undefined, `key=eq.${encodeURIComponent(key)}`);
  }

  // ── Guestlists ──
  async getEventGuestlists(eventId: string): Promise<any[]> {
    const { data, error } = await this.db
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
    const data = await this._rest('POST', 'event_guestlists', {
      event_id: dto.event_id,
      lineup_id: dto.lineup_id ?? null,
      artist_name: dto.artist_name,
      quota: dto.quota ?? 10,
    });
    return { ...data, entries: [] };
  }

  async updateEventGuestlist(id: string, changes: { artist_name?: string; quota?: number }): Promise<any> {
    return this._rest('PATCH', 'event_guestlists', changes, `id=eq.${id}`);
  }

  async deleteEventGuestlist(id: string): Promise<void> {
    await this._rest('DELETE', 'event_guestlists', undefined, `id=eq.${id}`);
  }

  async createGuestlistEntry(dto: { guestlist_id: string; guest_name: string; email?: string; accompagnants?: number; remarks?: string }): Promise<any> {
    return this._rest('POST', 'guestlist_entries', {
      guestlist_id: dto.guestlist_id,
      guest_name: dto.guest_name,
      email: dto.email ?? null,
      accompagnants: dto.accompagnants ?? 0,
      remarks: dto.remarks ?? null,
    });
  }

  async updateGuestlistEntry(id: string, changes: Partial<{ guest_name: string; accompagnants: number; remarks: string | null; is_checked_in: boolean }>): Promise<any> {
    return this._rest('PATCH', 'guestlist_entries', changes, `id=eq.${id}`);
  }

  async toggleDoorCheckin(entryId: string, isCheckedIn: boolean): Promise<{ checked_in_at: string | null }> {
    const checkedInAt = isCheckedIn ? new Date().toISOString() : null;
    await this._rest('PATCH', 'guestlist_entries', { is_checked_in: isCheckedIn, checked_in_at: checkedInAt }, `id=eq.${entryId}`);
    return { checked_in_at: checkedInAt };
  }

  async deleteGuestlistEntry(id: string): Promise<void> {
    await this._rest('DELETE', 'guestlist_entries', undefined, `id=eq.${id}`);
  }

  // ── Public Guestlist (by share_token) ──
  async getGuestlistByToken(token: string): Promise<any> {
    const { data, error } = await this.db
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
    const { data: event, error: eventErr } = await this.db
      .from('events')
      .select('id, name, date, venue, city, image_url')
      .eq('slug', slug)
      .single();
    if (eventErr) throw eventErr;

    // Get all guestlists for this event with entries
    const { data: guestlists, error: glErr } = await this.db
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
    const { data, error } = await this.db
      .from('guestlist_entries')
      .select('*, guestlist:event_guestlists(artist_name)')
      .eq('checkin_token', checkinToken)
      .single();
    if (error || !data) return null;

    // Mark as checked in
    await this._rest('PATCH', 'guestlist_entries', { is_checked_in: true }, `id=eq.${data.id}`);

    return { entry: { ...data, is_checked_in: true }, artistName: (data as any).guestlist?.artist_name ?? '' };
  }

  // ── Notifications ──
  async getNotifications(unreadOnly = false): Promise<any[]> {
    let query = this.db.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    if (unreadOnly) query = query.eq('is_read', false);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getUnreadCount(): Promise<number> {
    const { count } = await this.db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    return count ?? 0;
  }

  async markNotificationRead(id: string): Promise<void> {
    await this._rest('PATCH', 'notifications', { is_read: true }, `id=eq.${id}`).catch(() => undefined);
  }

  async markAllNotificationsRead(): Promise<void> {
    await this._rest('PATCH', 'notifications', { is_read: true }, 'is_read=eq.false', { expectArray: true }).catch(() => undefined);
  }

  async deleteNotification(id: string): Promise<void> {
    await this._rest('DELETE', 'notifications', undefined, `id=eq.${id}`);
  }

  // ── Notification Rules ──
  async getNotificationRules(): Promise<any[]> {
    const { data, error } = await this.db
      .from('notification_rules')
      .select('*, events!notification_rules_event_id_fkey(name, slug)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createNotificationRule(rule: any): Promise<any> {
    return this._rest('POST', 'notification_rules', rule);
  }

  async updateNotificationRule(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'notification_rules', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteNotificationRule(id: string): Promise<void> {
    await this._rest('DELETE', 'notification_rules', undefined, `id=eq.${id}`);
  }

  // ── Artists CRM ──
  // ── Products / Bar ──
  async getProducts(): Promise<any[]> {
    const { data, error } = await this.db
      .from('products')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createProduct(product: any): Promise<any> {
    return this._rest('POST', 'products', product);
  }

  async updateProduct(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'products', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteProduct(id: string): Promise<void> {
    await this._rest('DELETE', 'products', undefined, `id=eq.${id}`);
  }

  async getEventSales(eventId: string): Promise<any[]> {
    const { data, error } = await this.db
      .from('event_sales')
      .select('*, product:products(*)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async upsertEventSale(sale: any): Promise<any> {
    return this._rest('POST', 'event_sales', sale, 'on_conflict=event_id,product_id&select=*,product:products(*)', { resolution: 'merge-duplicates' });
  }

  async deleteEventSale(id: string): Promise<void> {
    await this._rest('DELETE', 'event_sales', undefined, `id=eq.${id}`);
  }

  // ── Artists CRM ──
  // ── Artist invoices & contracts (module Management) ──
  async getArtistInvoices(artistId: string): Promise<any[]> {
    const { data, error } = await this.db
      .from('artist_invoices')
      .select('*')
      .eq('artist_id', artistId)
      .order('invoice_number', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  /** Prochain n° de facture — séquence UNIQUE entre factures
      d'événements et factures artiste (pas de doublon). */
  async getNextArtistInvoiceNumber(): Promise<number> {
    const [a, b] = await Promise.all([
      this._rest<any[]>('GET', 'artist_invoices', undefined, SupabaseService.NEXT_NUM_QUERY),
      this._rest<any[]>('GET', 'event_invoices', undefined, SupabaseService.NEXT_NUM_QUERY).catch(() => [] as any[]),
    ]);
    const maxArtist = a?.[0]?.invoice_number ?? 0;
    const maxEvent = b?.[0]?.invoice_number ?? 0;
    return Math.max(maxArtist, maxEvent, 232) + 1;
  }

  async createArtistInvoice(dto: any): Promise<any> {
    return this._rest('POST', 'artist_invoices', dto);
  }

  async updateArtistInvoice(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'artist_invoices', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteArtistInvoice(id: string): Promise<void> {
    await this._rest('DELETE', 'artist_invoices', undefined, `id=eq.${id}`);
  }

  async getArtistContracts(artistId: string): Promise<any[]> {
    const { data, error } = await this.db
      .from('artist_contracts')
      .select('*')
      .eq('artist_id', artistId)
      .order('event_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  /** Toutes les factures d'événements avec l'événement joint (page Documents). */
  async getAllEventInvoices(): Promise<any[]> {
    const { data, error } = await this.db
      .from('event_invoices')
      .select('*, event:events(id, name, date, slug)')
      .order('invoice_number', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  /** Toutes les factures d'artistes avec l'artiste joint (page Documents). */
  async getAllArtistInvoices(): Promise<any[]> {
    const { data, error } = await this.db
      .from('artist_invoices')
      .select('*, artist:artists(id, name)')
      .order('invoice_number', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  // ── Fichiers (riders, fiches techniques…) — bucket Storage « documents » ──
  async getArtistDocuments(): Promise<any[]> {
    const { data, error } = await this.db
      .from('artist_documents')
      .select('*, artist:artists(id, name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createArtistDocument(dto: any): Promise<any> {
    return this._rest('POST', 'artist_documents', dto);
  }

  async deleteArtistDocument(id: string): Promise<void> {
    await this._rest('DELETE', 'artist_documents', undefined, `id=eq.${id}`);
  }

  async uploadDocumentFile(path: string, file: File): Promise<void> {
    const { error } = await this.db.storage.from('documents').upload(path, file, { upsert: false });
    if (error) throw error;
  }

  async getDocumentSignedUrl(path: string): Promise<string> {
    const { data, error } = await this.db.storage.from('documents').createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }

  async removeDocumentFile(path: string): Promise<void> {
    const { error } = await this.db.storage.from('documents').remove([path]);
    if (error) throw error;
  }

  /** Tous les contrats, tous artistes confondus (page Documents). */
  async getAllArtistContracts(): Promise<any[]> {
    const { data, error } = await this.db
      .from('artist_contracts')
      .select('*, artist:artists(id, name)')
      .order('event_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createArtistContract(dto: any): Promise<any> {
    return this._rest('POST', 'artist_contracts', dto);
  }

  async updateArtistContract(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'artist_contracts', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteArtistContract(id: string): Promise<void> {
    await this._rest('DELETE', 'artist_contracts', undefined, `id=eq.${id}`);
  }

  // ── Artist revenues (module Management) ──
  async getArtistRevenues(artistId: string): Promise<any[]> {
    const { data, error } = await this.db
      .from('artist_revenues')
      .select('*')
      .eq('artist_id', artistId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createArtistRevenue(dto: any): Promise<any> {
    return this._rest('POST', 'artist_revenues', dto);
  }

  async updateArtistRevenue(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'artist_revenues', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteArtistRevenue(id: string): Promise<void> {
    await this._rest('DELETE', 'artist_revenues', undefined, `id=eq.${id}`);
  }

  async getArtists(): Promise<any[]> {
    const { data, error } = await this.db
      .from('artists')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getArtistById(id: string): Promise<any> {
    const { data, error } = await this.db
      .from('artists')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async createArtist(artist: any): Promise<any> {
    return this._rest('POST', 'artists', artist);
  }

  async updateArtist(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'artists', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteArtist(id: string): Promise<void> {
    await this._rest('DELETE', 'artists', undefined, `id=eq.${id}`);
  }

  async getArtistBookings(artistId: string): Promise<any[]> {
    const { data, error } = await this.db
      .from('event_lineup')
      .select('*, event:events(name, date, venue, city, slug)')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  // ── Newsletter Contacts ──
  async getNewsletterContacts(): Promise<any[]> {
    const { data, error } = await this.db
      .from('newsletter_contacts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createNewsletterContact(contact: any): Promise<any> {
    return this._rest('POST', 'newsletter_contacts', contact);
  }

  async createNewsletterContactsBulk(contacts: any[]): Promise<any[]> {
    const data = await this._rest<any[]>('POST', 'newsletter_contacts', contacts, 'on_conflict=email', { resolution: 'ignore-duplicates', expectArray: true });
    return data ?? [];
  }

  async updateNewsletterContact(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'newsletter_contacts', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteNewsletterContact(id: string): Promise<void> {
    await this._rest('DELETE', 'newsletter_contacts', undefined, `id=eq.${id}`);
  }

  // ── Newsletters ──
  async getNewsletters(): Promise<any[]> {
    const { data, error } = await this.db
      .from('newsletters')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createNewsletter(newsletter: any): Promise<any> {
    return this._rest('POST', 'newsletters', newsletter);
  }

  async updateNewsletter(id: string, changes: any): Promise<any> {
    return this._rest('PATCH', 'newsletters', { ...changes, updated_at: new Date().toISOString() }, `id=eq.${id}`);
  }

  async deleteNewsletter(id: string): Promise<void> {
    await this._rest('DELETE', 'newsletters', undefined, `id=eq.${id}`);
  }
}
