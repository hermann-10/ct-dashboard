import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UsersStore } from './users.store';
import { UserProfile, ROLE_LABELS, PLAN_LABELS, resolveDisplayName, resolveRole } from './users.model';

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
    MatSnackBarModule,
  ],
  providers: [UsersStore],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent implements OnInit {
  readonly store = inject(UsersStore);
  private readonly snackBar = inject(MatSnackBar);
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

  // Inline name editing
  editingUserId = signal<string | null>(null);
  editingName = signal('');

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

  async onChangeRole(user: UserProfile, newRole: 'admin' | 'user'): Promise<void> {
    if (resolveRole(user) === newRole) return;
    // Update both role and is_admin to support both DB schemas
    const ok = await this.store.updateUser(user.id, { role: newRole, is_admin: newRole === 'admin' });
    if (ok) {
      this.snackBar.open(
        `${resolveDisplayName(user) || user.email} est maintenant ${ROLE_LABELS[newRole]}`,
        'OK',
        { duration: 3000 },
      );
    }
  }

  startEditName(user: UserProfile): void {
    this.editingUserId.set(user.id);
    this.editingName.set(resolveDisplayName(user));
  }

  cancelEditName(): void {
    this.editingUserId.set(null);
    this.editingName.set('');
  }

  async saveEditName(userId: string): Promise<void> {
    const name = this.editingName().trim();
    if (!name) return;
    const ok = await this.store.updateUser(userId, { full_name: name });
    if (ok) {
      this.snackBar.open('Nom mis à jour', 'OK', { duration: 2000 });
    }
    this.editingUserId.set(null);
    this.editingName.set('');
  }

  getUserDisplayName(user: UserProfile): string {
    return resolveDisplayName(user) || 'Sans nom';
  }

  getUserRole(user: UserProfile): 'admin' | 'user' {
    return resolveRole(user);
  }

  getInitials(user: UserProfile): string {
    const name = resolveDisplayName(user);
    if (!name) return '?';
    return name
      .split(' ')
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getRoleBadgeClass(user: UserProfile): string {
    return resolveRole(user) === 'admin' ? 'badge-role-admin' : 'badge-role-user';
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
