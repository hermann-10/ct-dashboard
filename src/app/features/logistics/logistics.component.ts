import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SupabaseService } from '../../core/services/supabase.service';
import {
  LogisticsItemDialogComponent,
  LogisticsItemDialogData,
} from './logistics-item-dialog.component';

export type LogisticsStatus = 'available' | 'in_use' | 'ordered' | 'unavailable' | 'out_of_stock';
export type LogisticsCondition = 'excellent' | 'bon' | 'a_reparer';

export interface LogisticsItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  status: LogisticsStatus;
  condition: LogisticsCondition | null;
  location: string | null;
  event_id: string | null;
  out_date: string | null;
  notes: string | null;
  event?: { id: string; name: string; date: string } | null;
}

export const LOGISTICS_CATEGORIES = ['Accueil', 'Décoration', 'Technique', 'Animation', 'Bar', 'Mobilier', 'Stockage', 'Divers'];

export const LOGISTICS_STATUS_LABELS: Record<LogisticsStatus, string> = {
  available: 'Disponible',
  in_use: 'En utilisation',
  ordered: 'En commande',
  unavailable: 'Pas dispo',
  out_of_stock: 'En rupture',
};

@Component({
  selector: 'app-logistics',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './logistics.component.html',
  styleUrl: './logistics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogisticsComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly dialog = inject(MatDialog);

  readonly categories = LOGISTICS_CATEGORIES;
  readonly statusLabels = LOGISTICS_STATUS_LABELS;

  readonly items = signal<LogisticsItem[]>([]);
  readonly events = signal<{ id: string; name: string; date: string }[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly available = signal(true);

  readonly search = signal('');
  readonly categoryFilter = signal<string | null>(null);
  readonly statusFilter = signal<'all' | LogisticsStatus>('all');

  readonly filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const cat = this.categoryFilter();
    const status = this.statusFilter();
    return this.items().filter(item => {
      if (cat && item.category !== cat) return false;
      if (status !== 'all' && item.status !== status) return false;
      if (!term) return true;
      return [item.name, item.category, item.location, item.event?.name, item.notes]
        .filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  });

  readonly kpis = computed(() => {
    const rows = this.items();
    return {
      total: rows.length,
      available: rows.filter(i => i.status === 'available').length,
      inUse: rows.filter(i => i.status === 'in_use').length,
      missing: rows.filter(i => i.status === 'unavailable' || i.status === 'out_of_stock').length,
    };
  });

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [items, events] = await Promise.all([
        this.supabase.getLogisticsItems(),
        this.supabase.getEvents().catch(() => []),
      ]);
      this.items.set(items);
      this.events.set(events.map((e: any) => ({ id: e.id, name: e.name, date: e.date })));
      this.available.set(true);
    } catch (e: any) {
      // Table absente → écran d'installation ; autre erreur → bandeau
      if ((e.message ?? '').includes('logistics_items')) {
        this.available.set(false);
      } else {
        this.error.set(e.message ?? 'Erreur de chargement');
      }
    } finally {
      this.loading.set(false);
    }
  }

  statusClass(item: LogisticsItem): string {
    switch (item.status) {
      case 'available': return 'st-available';
      case 'in_use': return 'st-inuse';
      case 'ordered': return 'st-ordered';
      default: return 'st-missing';
    }
  }

  onAdd(): void {
    const ref = this.dialog.open(LogisticsItemDialogComponent, {
      data: { mode: 'create', events: this.events() } as LogisticsItemDialogData,
      width: '560px',
    });
    ref.afterClosed().subscribe(async result => {
      if (!result) return;
      try {
        const created = await this.supabase.createLogisticsItem(result);
        this.items.update(rows =>
          [...rows, { ...created, event: this.events().find(e => e.id === created.event_id) ?? null }]
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch (e: any) {
        alert('Ajout impossible : ' + (e.message ?? 'erreur inconnue') +
          "\n\nSi la table n'existe pas encore, exécute logistics-migration.sql dans Supabase.");
      }
    });
  }

  onEdit(item: LogisticsItem): void {
    const ref = this.dialog.open(LogisticsItemDialogComponent, {
      data: { mode: 'edit', item, events: this.events() } as LogisticsItemDialogData,
      width: '560px',
    });
    ref.afterClosed().subscribe(async result => {
      if (!result) return;
      try {
        const updated = await this.supabase.updateLogisticsItem(item.id, result);
        this.items.update(rows => rows.map(r => (r.id === item.id
          ? { ...r, ...updated, event: this.events().find(e => e.id === updated.event_id) ?? null }
          : r)));
      } catch (e: any) {
        alert('Mise à jour impossible : ' + (e.message ?? 'erreur inconnue'));
      }
    });
  }

  /** Cycle rapide Disponible → En utilisation → Disponible. Les autres statuts passent par Modifier. */
  async onStatus(item: LogisticsItem): Promise<void> {
    const next: LogisticsStatus = item.status === 'available' ? 'in_use' : 'available';
    const changes: any = { status: next };
    if (next === 'available') {
      changes.event_id = null;
      changes.out_date = null;
    }
    try {
      const updated = await this.supabase.updateLogisticsItem(item.id, changes);
      this.items.update(rows => rows.map(r => (r.id === item.id
        ? { ...r, ...updated, event: next === 'available' ? null : r.event }
        : r)));
    } catch (e: any) {
      alert('Changement de statut impossible : ' + (e.message ?? 'erreur inconnue'));
    }
  }

  async onDelete(item: LogisticsItem): Promise<void> {
    if (!confirm(`Supprimer « ${item.name} » de l'inventaire ?`)) return;
    try {
      await this.supabase.deleteLogisticsItem(item.id);
      this.items.update(rows => rows.filter(r => r.id !== item.id));
    } catch (e: any) {
      alert('Suppression impossible : ' + (e.message ?? 'erreur inconnue'));
    }
  }
}
