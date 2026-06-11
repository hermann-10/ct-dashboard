import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
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

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
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

  async getClicksCount(eventSlug?: string): Promise<number> {
    let query = this.supabase.from('clicks').select('*', { count: 'exact', head: true });
    if (eventSlug) query = query.eq('event_slug', eventSlug);
    const { count } = await query;
    return count ?? 0;
  }

  async getUniqueVisitors(eventSlug?: string): Promise<number> {
    let query = this.supabase.from('clicks').select('ip_hash');
    if (eventSlug) query = query.eq('event_slug', eventSlug);
    const { data } = await query;
    return new Set((data ?? []).map(d => d.ip_hash)).size;
  }

  async getDeviceBreakdown(eventSlug?: string) {
    let query = this.supabase.from('clicks').select('device');
    if (eventSlug) query = query.eq('event_slug', eventSlug);
    const { data } = await query;
    const counts: Record<string, number> = {};
    (data ?? []).forEach(d => { counts[d.device] = (counts[d.device] || 0) + 1; });
    return Object.entries(counts).map(([device, count]) => ({ device, count }));
  }

  async getUtmBreakdown(eventSlug?: string) {
    let query = this.supabase.from('clicks').select('utm_source, utm_medium, utm_campaign');
    if (eventSlug) query = query.eq('event_slug', eventSlug);
    const { data } = await query;
    const sources: Record<string, number> = {};
    (data ?? []).forEach(d => {
      const key = d.utm_source || 'direct';
      sources[key] = (sources[key] || 0) + 1;
    });
    return Object.entries(sources).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
  }

  async getClicksTimeline(eventSlug?: string) {
    let query = this.supabase.from('clicks').select('created_at');
    if (eventSlug) query = query.eq('event_slug', eventSlug);
    query = query.order('created_at', { ascending: true });
    const { data } = await query;
    const byDay: Record<string, number> = {};
    (data ?? []).forEach(d => {
      const day = d.created_at.substring(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return Object.entries(byDay).map(([date, count]) => ({ date, count }));
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
    const { data, error } = await this.supabase.from('events').insert(event).select().single();
    if (error) throw error;
    return data;
  }

  async updateEvent(id: string, changes: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('events')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteEvent(id: string): Promise<void> {
    const { error } = await this.supabase.from('events').delete().eq('id', id);
    if (error) throw error;
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
}
