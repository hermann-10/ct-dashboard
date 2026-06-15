import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Product, CreateProductDto, PRODUCT_CATEGORIES, ProductCategory } from '../../bar.model';

interface DialogData {
  mode: 'create' | 'edit';
  product?: Product;
}

@Component({
  selector: 'app-product-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDialogModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Nouveau produit' : 'Modifier le produit' }}</h2>
    <mat-dialog-content>
      <div class="form-grid">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nom *</mat-label>
          <input matInput [ngModel]="name()" (ngModelChange)="name.set($event)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Catégorie</mat-label>
          <mat-select [ngModel]="category()" (ngModelChange)="category.set($event)">
            @for (c of categories; track c.value) {
              <mat-option [value]="c.value">{{ c.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Unité</mat-label>
          <input matInput [ngModel]="unit()" (ngModelChange)="unit.set($event)" placeholder="unité, bouteille, pack" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Prix d'achat (CHF)</mat-label>
          <input matInput type="number" min="0" step="0.10" [ngModel]="purchasePrice()" (ngModelChange)="purchasePrice.set($event)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Prix de vente (CHF)</mat-label>
          <input matInput type="number" min="0" step="0.50" [ngModel]="sellPrice()" (ngModelChange)="sellPrice.set($event)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Stock actuel</mat-label>
          <input matInput type="number" min="0" [ngModel]="stock()" (ngModelChange)="stock.set($event)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Image URL</mat-label>
          <input matInput [ngModel]="imageUrl()" (ngModelChange)="imageUrl.set($event)" />
        </mat-form-field>

        <div class="toggle-row">
          <mat-slide-toggle [ngModel]="isActive()" (ngModelChange)="isActive.set($event)">
            Produit actif
          </mat-slide-toggle>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes</mat-label>
          <textarea matInput rows="2" [ngModel]="notes()" (ngModelChange)="notes.set($event)"></textarea>
        </mat-form-field>
      </div>

      @if (sellPrice() > 0 && purchasePrice() > 0) {
        <p class="margin-preview">
          Marge : <strong>{{ (((sellPrice() - purchasePrice()) / sellPrice()) * 100).toFixed(0) }}%</strong>
          ({{ (sellPrice() - purchasePrice()).toFixed(2) }} CHF / {{ unit() }})
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!name().trim()" (click)="onSave()">
        {{ data.mode === 'create' ? 'Créer' : 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 0.75rem;
    }
    .full-width { grid-column: 1 / -1; }
    .toggle-row { display: flex; align-items: center; padding: 0.5rem 0; }
    .margin-preview {
      font-size: 0.85rem;
      color: #16a34a;
      margin: 0.5rem 0 0;
      strong { font-size: 1rem; }
    }
    mat-dialog-content { max-height: 70vh; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ProductDialogComponent>);
  readonly data: DialogData = inject(MAT_DIALOG_DATA);
  readonly categories = PRODUCT_CATEGORIES;

  name = signal(this.data.product?.name ?? '');
  category = signal<ProductCategory>(this.data.product?.category ?? 'boisson');
  purchasePrice = signal(this.data.product?.purchase_price ?? 0);
  sellPrice = signal(this.data.product?.sell_price ?? 0);
  stock = signal(this.data.product?.stock ?? 0);
  unit = signal(this.data.product?.unit ?? 'unité');
  imageUrl = signal(this.data.product?.image_url ?? '');
  isActive = signal(this.data.product?.is_active ?? true);
  notes = signal(this.data.product?.notes ?? '');

  onSave(): void {
    const dto: CreateProductDto = {
      name: this.name().trim(),
      category: this.category(),
      purchase_price: this.purchasePrice(),
      sell_price: this.sellPrice(),
      stock: this.stock(),
      unit: this.unit().trim() || 'unité',
      image_url: this.imageUrl().trim() || null,
      is_active: this.isActive(),
      notes: this.notes().trim(),
    };
    this.dialogRef.close(dto);
  }
}
