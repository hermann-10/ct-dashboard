import { Component, inject, signal, effect, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ArtistsStore } from './artists.store';
import { ARTIST_ROLES } from '../event-management/event-management.model';
import { ArtistDialogComponent } from './components/artist-dialog/artist-dialog.component';

@Component({
  selector: 'app-artists',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  providers: [ArtistsStore],
  templateUrl: './artists.component.html',
  styleUrl: './artists.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtistsComponent implements OnInit {
  readonly store = inject(ArtistsStore);
  private readonly dialog = inject(MatDialog);
  readonly roles = ARTIST_ROLES;

  viewMode = signal<'list' | 'cards'>(
    localStorage.getItem('artists.viewMode') === 'list' ? 'list' : 'cards'
  );

  constructor() {
    // Mémoriser la vue choisie (liste / cards)
    effect(() => localStorage.setItem('artists.viewMode', this.viewMode()));
  }

  ngOnInit(): void {
    this.store.loadArtists();
  }

  onSearch(term: string): void {
    this.store.setSearch(term);
  }

  onFilterGenre(genre: string): void {
    this.store.setFilterGenre(genre);
  }

  onFilterRole(role: string): void {
    this.store.setFilterRole(role);
  }

  onAddArtist(): void {
    const ref = this.dialog.open(ArtistDialogComponent, {
      width: '520px',
      data: { mode: 'create' },
    });
    ref.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.store.createArtist(result);
      }
    });
  }

  getRoleLabel(role: string): string {
    return this.roles.find(r => r.value === role)?.label ?? role;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getRatingStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }
}
