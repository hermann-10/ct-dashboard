import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { SupabaseService } from '../../core/services/supabase.service';

interface NotificationRule {
  id: string;
  type: string;
  event_id: string;
  threshold_value: number | null;
  reminder_days: number;
  is_active: boolean;
  email_to: string | null;
  events?: { name: string; slug: string };
}

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSlideToggleModule,
    MatDialogModule, MatTooltipModule, MatChipsModule,
  ],
  template: `
    <div class="notification-settings">
      <div class="page-header">
        <a mat-icon-button routerLink="/admin" matTooltip="Retour">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h2>Parametres de notifications</h2>
        <button mat-flat-button color="primary" (click)="showAddForm.set(!showAddForm())">
          <mat-icon>{{ showAddForm() ? 'close' : 'add' }}</mat-icon>
          {{ showAddForm() ? 'Annuler' : 'Nouvelle regle' }}
        </button>
      </div>

      @if (showAddForm()) {
        <mat-card class="add-form-card">
          <mat-card-content>
            <form [formGroup]="ruleForm" (ngSubmit)="onCreateRule()" class="rule-form">
              <mat-form-field appearance="outline">
                <mat-label>Type</mat-label>
                <mat-select formControlName="type">
                  <mat-option value="event_reminder">Rappel evenement (J-X)</mat-option>
                  <mat-option value="click_threshold">Seuil de clics</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Evenement</mat-label>
                <mat-select formControlName="event_id">
                  @for (evt of events(); track evt.id) {
                    <mat-option [value]="evt.id">{{ evt.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (ruleForm.get('type')?.value === 'event_reminder') {
                <mat-form-field appearance="outline">
                  <mat-label>Jours avant l'evenement</mat-label>
                  <input matInput type="number" formControlName="reminder_days" min="1" max="30" />
                </mat-form-field>
              }

              @if (ruleForm.get('type')?.value === 'click_threshold') {
                <mat-form-field appearance="outline">
                  <mat-label>Seuil de clics</mat-label>
                  <input matInput type="number" formControlName="threshold_value" min="1" />
                </mat-form-field>
              }

              <mat-form-field appearance="outline">
                <mat-label>Email (optionnel)</mat-label>
                <input matInput type="email" formControlName="email_to" placeholder="ex: vous@email.com" />
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit" [disabled]="ruleForm.invalid || saving()">
                Creer la regle
              </button>
            </form>
          </mat-card-content>
        </mat-card>
      }

      @if (loading()) {
        <p class="loading-text">Chargement...</p>
      } @else if (rules().length === 0) {
        <div class="empty-state">
          <mat-icon>notifications_off</mat-icon>
          <p>Aucune regle de notification configuree.</p>
          <p class="hint">Creez une regle pour recevoir des alertes automatiques.</p>
        </div>
      } @else {
        <div class="rules-list">
          @for (rule of rules(); track rule.id) {
            <mat-card class="rule-card" [class.inactive]="!rule.is_active">
              <div class="rule-content">
                <mat-icon class="rule-icon" [class]="'type-' + rule.type">
                  {{ rule.type === 'event_reminder' ? 'event' : 'trending_up' }}
                </mat-icon>
                <div class="rule-info">
                  <span class="rule-label">
                    @if (rule.type === 'event_reminder') {
                      Rappel J-{{ rule.reminder_days }}
                    } @else {
                      Seuil : {{ rule.threshold_value }} clics
                    }
                  </span>
                  <span class="rule-event">{{ rule.events?.name ?? 'Evenement supprime' }}</span>
                  @if (rule.email_to) {
                    <span class="rule-email">Email → {{ rule.email_to }}</span>
                  }
                </div>
                <div class="rule-actions">
                  <mat-slide-toggle
                    [checked]="rule.is_active"
                    (change)="toggleRule(rule)"
                    matTooltip="{{ rule.is_active ? 'Desactiver' : 'Activer' }}"
                  />
                  <button mat-icon-button color="warn" (click)="deleteRule(rule.id)" matTooltip="Supprimer">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .notification-settings {
      max-width: 800px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      h2 { flex: 1; margin: 0; font-size: 1.3rem; font-weight: 600; }
    }

    .add-form-card {
      margin-bottom: 1.5rem;
    }

    .rule-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .loading-text {
      text-align: center;
      padding: 2rem;
      opacity: 0.6;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      mat-icon { font-size: 3rem; width: 3rem; height: 3rem; opacity: 0.3; }
      p { margin: 0.5rem 0; }
      .hint { font-size: 0.85rem; opacity: 0.5; }
    }

    .rules-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .rule-card {
      &.inactive { opacity: 0.5; }
    }

    .rule-content {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem;
    }

    .rule-icon {
      font-size: 1.5rem;
      width: 1.5rem;
      height: 1.5rem;
      &.type-event_reminder { color: #2196f3; }
      &.type-click_threshold { color: #ff6d00; }
    }

    .rule-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .rule-label {
      font-weight: 600;
      font-size: 0.95rem;
    }

    .rule-event {
      font-size: 0.85rem;
      opacity: 0.7;
    }

    .rule-email {
      font-size: 0.8rem;
      opacity: 0.5;
    }

    .rule-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationSettingsComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly fb = inject(FormBuilder);

  rules = signal<NotificationRule[]>([]);
  events = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  showAddForm = signal(false);

  ruleForm = this.fb.nonNullable.group({
    type: ['event_reminder', Validators.required],
    event_id: ['', Validators.required],
    reminder_days: [3],
    threshold_value: [100],
    email_to: [''],
  });

  async ngOnInit(): Promise<void> {
    try {
      const [rules, events] = await Promise.all([
        this.supabase.getNotificationRules(),
        this.supabase.getEvents(),
      ]);
      this.rules.set(rules);
      this.events.set(events);
    } catch (e) {
      console.error('Failed to load notification rules', e);
    } finally {
      this.loading.set(false);
    }
  }

  async onCreateRule(): Promise<void> {
    if (this.ruleForm.invalid) return;
    this.saving.set(true);
    try {
      const val = this.ruleForm.getRawValue();
      const rule: any = {
        type: val.type,
        event_id: val.event_id,
        email_to: val.email_to || null,
      };
      if (val.type === 'event_reminder') {
        rule.reminder_days = val.reminder_days;
      } else {
        rule.threshold_value = val.threshold_value;
      }
      const created = await this.supabase.createNotificationRule(rule);
      this.rules.update(list => [created, ...list]);
      this.showAddForm.set(false);
      this.ruleForm.reset({ type: 'event_reminder', reminder_days: 3, threshold_value: 100 });
    } catch (e) {
      console.error('Failed to create rule', e);
    } finally {
      this.saving.set(false);
    }
  }

  async toggleRule(rule: NotificationRule): Promise<void> {
    try {
      await this.supabase.updateNotificationRule(rule.id, { is_active: !rule.is_active });
      this.rules.update(list =>
        list.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r)
      );
    } catch (e) {
      console.error('Failed to toggle rule', e);
    }
  }

  async deleteRule(id: string): Promise<void> {
    if (!confirm('Supprimer cette regle ?')) return;
    try {
      await this.supabase.deleteNotificationRule(id);
      this.rules.update(list => list.filter(r => r.id !== id));
    } catch (e) {
      console.error('Failed to delete rule', e);
    }
  }
}
