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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ChargeCategory, CHARGE_CATEGORIES, EventCharge } from '../../event-management.model';

interface ArtistOption {
  id: string;
  name: string;
  genre: string;
  city: string;
}

export interface ChargeDialogData {
  mode: 'create' | 'edit';
  charge?: EventCharge;
}

@Component({
  selector: 'app-charge-dialog',
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
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.mode === 'create' ? 'Ajouter une charge' : 'Modifier la charge' }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Catégorie</mat-label>
          <mat-select formControlName="category" (selectionChange)="onCategoryChange($event.value)">
            @for (cat of categories; track cat.value) {
              <mat-option [value]="cat.value">{{ cat.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Artist autocomplete when category is dj_fees -->
        @if (isDjFees()) {
          <mat-form-field appearance="outline">
            <mat-label>Artiste</mat-label>
            <input
              matInput
              formControlName="label"
              [matAutocomplete]="artistAuto"
              (input)="onArtistSearch($event)"
              placeholder="Tapez pour rechercher un artiste..."
            />
            <mat-autocomplete
              #artistAuto="matAutocomplete"
              (optionSelected)="onArtistSelected($event)"
            >
              @for (artist of filteredArtists(); track artist.id) {
                <mat-option [value]="artist.name">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: var(--hm-brand-primary, #6C5CE7);">person</mat-icon>
                    <div>
                      <div style="font-weight: 600;">{{ artist.name }}</div>
                      @if (artist.genre || artist.city) {
                        <div style="font-size: 0.75rem; color: #888;">
                          {{ artist.genre }}
                          @if (artist.city) { · {{ artist.city }} }
                        </div>
                      }
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
            @if (selectedArtistName()) {
              <mat-icon matSuffix style="color: var(--hm-success, #10B981);">check_circle</mat-icon>
            }
          </mat-form-field>
        } @else {
          <mat-form-field appearance="outline">
            <mat-label>Libellé</mat-label>
            <input matInput formControlName="label" />
          </mat-form-field>
        }

        @if (creatingArtist()) {
          <div class="creating-msg">
            <mat-spinner diameter="18" />
            <span>Création de l'artiste en cours...</span>
          </div>
        }

        <mat-form-field appearance="outline">
          <mat-label>Montant (CHF)</mat-label>
          <input matInput type="number" formControlName="amount" min="0" />
        </mat-form-field>

        <mat-slide-toggle formControlName="is_paid">Payée</mat-slide-toggle>

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
export class ChargeDialogComponent implements OnInit {
  readonly data = inject<ChargeDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ChargeDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly supabase = inject(SupabaseService);

  readonly categories = CHARGE_CATEGORIES;

  // Artist autocomplete state
  allArtists = signal<ArtistOption[]>([]);
  searchTerm = signal('');
  selectedArtistName = signal<string | null>(null);
  loadingArtists = signal(false);
  creatingArtist = signal(false);
  currentCategory = signal<ChargeCategory>(this.data.charge?.category ?? ('' as ChargeCategory));

  isDjFees = computed(() => this.currentCategory() === 'dj_fees');

  filteredArtists = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (term.length < 1) return this.allArtists();
    return this.allArtists().filter(a =>
      a.name.toLowerCase().includes(term)
    );
  });

  readonly form = this.fb.nonNullable.group({
    category: [this.data.charge?.category ?? ('' as ChargeCategory), Validators.required],
    label: [this.data.charge?.label ?? '', Validators.required],
    amount: [this.data.charge?.amount ?? 0, [Validators.required, Validators.min(0)]],
    is_paid: [this.data.charge?.is_paid ?? false],
    notes: [this.data.charge?.notes ?? ''],
  });

  ngOnInit(): void {
    // Load artists if category is already dj_fees (edit mode)
    if (this.form.get('category')?.value === 'dj_fees') {
      this.loadArtists();
    }
  }

  onCategoryChange(value: ChargeCategory): void {
    this.currentCategory.set(value);
    if (value === 'dj_fees' && this.allArtists().length === 0) {
      this.loadArtists();
    }
  }

  private async loadArtists(): Promise<void> {
    this.loadingArtists.set(true);
    try {
      const artists = await this.supabase.getArtists();
      this.allArtists.set(artists.map((a: any) => ({
        id: a.id,
        name: a.name,
        genre: a.genre ?? '',
        city: a.city ?? '',
      })));
    } catch { /* ignore */ }
    this.loadingArtists.set(false);
  }

  onArtistSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    if (this.selectedArtistName() && this.selectedArtistName() !== value) {
      this.selectedArtistName.set(null);
    }
  }

  onArtistSelected(event: any): void {
    const name: string = event.option.value;
    this.selectedArtistName.set(name);
    this.form.patchValue({ label: name });
  }

  async onCreateNewArtist(): Promise<void> {
    const name = this.searchTerm().trim();
    if (!name) return;
    this.creatingArtist.set(true);
    try {
      const newArtist = await this.supabase.createArtist({ name, role: 'dj' });
      const option: ArtistOption = {
        id: newArtist.id,
        name: newArtist.name,
        genre: newArtist.genre ?? '',
        city: newArtist.city ?? '',
      };
      this.allArtists.update(list => [...list, option]);
      this.selectedArtistName.set(newArtist.name);
      this.form.patchValue({ label: newArtist.name });
    } catch { /* ignore */ }
    this.creatingArtist.set(false);
  }

  onSave(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}
