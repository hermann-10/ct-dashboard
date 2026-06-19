import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UsersStore } from './users.store';
import { UserProfile, ROLE_LABELS, PLAN_LABELS } from './users.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatSlideToggleModule,
  ],
  providers: [UsersStore],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent implements OnInit {
  readonly store = inject(UsersStore);
  readonly roleLabels = ROLE_LABELS;
  readonly planLabels = PLAN_LABELS;

  readonly roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'user', label: 'Utilisateur' },
  ];

  readonly planOptions = [
    { value: 'free', label: 'Gratuit' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' },
  ];

  ngOnInit(): void {
    this.store.loadUsers();
  }

  onSearch(term: string): void {
    this.store.setSearch(term);
  }

  onFilterRole(role: string): void {
    this.store.setFilterRole(role);
  }

  onFilterPlan(plan: string): void {
    this.store.setFilterPlan(plan);
  }

  async toggleActive(user: UserProfile): Promise<void> {
    await this.store.updateUser(user.id, { is_active: !user.is_active });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getRoleBadgeClass(role: string): string {
    return role === 'admin' ? 'badge-role-admin' : 'badge-role-user';
  }

  getPlanBadgeClass(plan: string): string {
    switch (plan) {
      case 'pro':
        return 'badge-plan-pro';
      case 'enterprise':
        return 'badge-plan-enterprise';
      default:
        return 'badge-plan-free';
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Jamais';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  formatDateTime(dateStr: string | null): string {
    if (!dateStr) return 'Jamais';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
