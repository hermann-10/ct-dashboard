import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ArtistsStore } from '../../artists.store';
import { ARTIST_ROLES } from '../../../event-management/event-management.model';
import { ArtistDialogComponent } from '../artist-dialog/artist-dialog.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-artist-detail',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  providers: [ArtistsStore],
  templateUrl: './artist-detail.component.html',
  styleUrl: './artist-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtistDetailComponent implements OnInit {
  readonly store = inject(ArtistsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  readonly roles = ARTIST_ROLES;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.store.loadArtist(id);
    }
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

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-CH', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('fr-CH', { style: 'currency', currency: 'CHF' });
  }

  onEdit(): void {
    const artist = this.store.selectedArtist();
    if (!artist) return;
    const ref = this.dialog.open(ArtistDialogComponent, {
      width: '520px',
      data: { mode: 'edit', artist },
    });
    ref.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.store.updateArtist(artist.id, result);
      }
    });
  }

  async onDelete(): Promise<void> {
    const artist = this.store.selectedArtist();
    if (!artist) return;
    if (!confirm(`Supprimer ${artist.name} ? Cette action est irréversible.`)) return;
    const ok = await this.store.deleteArtist(artist.id);
    if (ok) {
      this.router.navigate(['/admin/artists']);
    }
  }
}
