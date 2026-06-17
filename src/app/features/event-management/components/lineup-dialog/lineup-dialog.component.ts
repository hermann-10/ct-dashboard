import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ArtistRole, ARTIST_ROLES, EventLineup } from '../../event-management.model';

interface ArtistOption {
  id: string;
  name: string;
  role: string;
  genres: string[];
  city: string;
}

export interface LineupDialogData {
  mode: 'create' | 'edit';
  entry?: EventLineup;
  existingArtistNames?: string[];
}

@Component({
  selector: 'app-lineup-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatAutocompleteModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.mode === 'create' ? 'Ajouter un artiste' : 'Modifier l\\'artiste' }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <!-- Artist name with autocomplete -->
        <mat-form-field appearance="outline">
          <mat-label>Nom de l'artiste</mat-label>
          <input
            matInput
            formControlName="artist_name"
            [matAutocomplete]="artistAuto"
            (input)="onArtistSearch($event)"
          />
          <mat-autocomplete
            #artistAuto="matAutocomplete"
            (optionSelected)="onArtistSelected($event)"
            [displayWith]="displayArtistName"
          >
            @for (artist of filteredArtists(); track artist.id) {
              <mat-option [value]="artist">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: var(--hm-brand-primary, #6C5CE7);">person</mat-icon>
                  <div>
                    <div style="font-weight: 600;">{{ artist.name }}</div>
                    <div style="font-size: 0.75rem; color: #888;">
                      {{ artist.genres.join(', ') }}
                      @if (artist.city) { · {{ artist.city }} }
                    </div>
                  </div>
                </div>
              </mat-option>
            }
            @if (searchTerm().length >= 2 && filteredArtists().length === 0 && !loadingArtists()) {
              <mat-option disabled>
                <span style="color: #888;">Aucun artiste trouvé</span>
              </mat-option>
              <mat-option (click)="onCreateNewArtist()">
                <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--hm-brand-primary, #6C5CE7); font-weight: 600;">
                  <mat-icon style="font-size: 18px; width: 18px; height: 18px;">add_circle</mat-icon>
                  Créer « {{ searchTerm() }} » comme nouvel artiste
                </div>
              </mat-option>
            }
          </mat-autocomplete>
          @if (selectedArtist()) {
            <mat-icon matSuffix style="color: var(--hm-success, #10B981)">check_circle</mat-icon>
          }
        </mat-form-field>

        @if (creatingArtist()) {
          <div class="creating-msg">
            <mat-spinner diameter="18" />
            <span>Création de l'artiste en cours...</span>
          </div>
        }

        <mat-form-field appearance="outline">
          <mat-label>Rôle</mat-label>
          <mat-select formControlName="role">
            @for (r of roles; track r.value) {
              <mat-option [value]="r.value">{{ r.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Cachet (CHF)</mat-label>
          <input matInput type="number" formControlName="fee" min="0" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Créneau</mat-label>
          <input matInput formControlName="set_time" placeholder="ex: 22:00 - 23:30" />
        </mat-form-field>

        <mat-slide-toggle formControlName="is_confirmed">Confirmé</mat-slide-toggle>

        <mat-form-field appearance="outline">
          <mat-label>Contact</mat-label>
          <input matInput formControlName="contact_info" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid || creatingArtist()"
        (click)="onSave()"
      >
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .creating-msg {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--hm-brand-primary, #6C5CE7);
      padding: 0.5rem 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineupDialogComponent implements OnInit {
  readonly data = inject<LineupDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<LineupDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly supabase = inject(SupabaseService);

  readonly roles = ARTIST_ROLES;

  // Artist autocomplete state
  allArtists = signal<ArtistOption[]>([]);
  searchTerm = signal('');
  selectedArtist = signal<ArtistOption | null>(null);
  loadingArtists = signal(false);
  creatingArtist = signal(false);

  private existingNames = new Set(
    (this.data.existingArtistNames ?? []).map(n => n.toLowerCase())
  );

  filteredArtists = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    let list = this.allArtists();
    // In create mode, exclude artists already in the lineup
    if (this.data.mode === 'create') {
      list = list.filter(a => !this.existingNames.has(a.name.toLowerCase()));
    }
    if (term.length < 1) return list;
    return list.filter(a => a.name.toLowerCase().includes(term));
  });

  readonly form = this.fb.nonNullable.group({
    artist_name: [this.data.entry?.artist_name ?? '', Validators.required],
    artist_id: [this.data.entry?.artist_id ?? (null as string | null)],
    role: [this.data.entry?.role ?? ('' as ArtistRole), Validators.required],
    fee: [this.data.entry?.fee ?? 0, Validators.min(0)],
    set_time: [this.data.entry?.set_time ?? ''],
    is_confirmed: [this.data.entry?.is_confirmed ?? false],
    contact_info: [this.data.entry?.contact_info ?? ''],
    notes: [this.data.entry?.notes ?? ''],
  });

  ngOnInit(): void {
    this.loadArtists();
  }

  private async loadArtists(): Promise<void> {
    this.loadingArtists.set(true);
    try {
      const artists = await this.supabase.getArtists();
      this.allArtists.set(artists.map((a: any) => ({
        id: a.id,
        name: a.name,
        role: a.role ?? '',
        genres: a.genres ?? [],
        city: a.city ?? '',
      })));
    } catch { /* ignore */ }
    this.loadingArtists.set(false);
  }

  onArtistSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    // Clear selection if user is typing something different
    if (this.selectedArtist() && this.selectedArtist()!.name !== value) {
      this.selectedArtist.set(null);
      this.form.patchValue({ artist_id: null });
    }
  }

  onArtistSelected(event: any): void {
    const artist: ArtistOption = event.option.value;
    this.selectedArtist.set(artist);
    this.form.patchValue({
      artist_name: artist.name,
      artist_id: artist.id,
      role: (artist.role as ArtistRole) || this.form.get('role')?.value,
    });
    this.searchTerm.set(artist.name);
  }

  displayArtistName = (artist: ArtistOption | string): string => {
    if (typeof artist === 'string') return artist;
    return artist?.name ?? '';
  };

  async onCreateNewArtist(): Promise<void> {
    const name = this.searchTerm().trim();
    if (!name) return;
    this.creatingArtist.set(true);
    try {
      const newArtist = await this.supabase.createArtist({
        name,
        role: this.form.get('role')?.value || 'dj',
      });
      const option: ArtistOption = {
        id: newArtist.id,
        name: newArtist.name,
        role: newArtist.role ?? '',
        genres: newArtist.genres ?? [],
        city: newArtist.city ?? '',
      };
      this.allArtists.update(list => [...list, option]);
      this.selectedArtist.set(option);
      this.form.patchValue({
        artist_name: newArtist.name,
        artist_id: newArtist.id,
      });
    } catch { /* ignore */ }
    this.creatingArtist.set(false);
  }

  onSave(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    // Ensure artist_name is a string (not an object from autocomplete)
    if (typeof raw.artist_name === 'object' && raw.artist_name !== null) {
      raw.artist_name = (raw.artist_name as any).name;
    }
    this.dialogRef.close(raw);
  }
}
