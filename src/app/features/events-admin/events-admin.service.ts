import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { EventRecord, CreateEventDto, UpdateEventDto } from './events-admin.model';

@Injectable({ providedIn: 'root' })
export class EventsAdminService {
  private readonly supabase = inject(SupabaseService);

  async getAll(): Promise<EventRecord[]> {
    return this.supabase.getEvents(false);
  }

  async create(dto: CreateEventDto): Promise<EventRecord> {
    return this.supabase.createEvent(dto);
  }

  async update(id: string, dto: UpdateEventDto): Promise<EventRecord> {
    return this.supabase.updateEvent(id, dto);
  }

  async delete(id: string): Promise<void> {
    return this.supabase.deleteEvent(id);
  }

  async togglePublished(id: string, isPublished: boolean): Promise<EventRecord> {
    return this.supabase.toggleEventPublished(id, isPublished);
  }
}
