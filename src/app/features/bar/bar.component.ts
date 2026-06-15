import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { BarStore } from './bar.store';
import { PRODUCT_CATEGORIES, Product } from './bar.model';
import { ProductDialogComponent } from './components/product-dialog/product-dialog.component';

@Component({
  selector: 'app-bar',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  providers: [BarStore],
  templateUrl: './bar.component.html',
  styleUrl: './bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarComponent implements OnInit {
  readonly store = inject(BarStore);
  private readonly dialog = inject(MatDialog);
  readonly categories = PRODUCT_CATEGORIES;

  ngOnInit(): void {
    this.store.loadProducts();
  }

  onSearch(term: string): void {
    this.store.setSearch(term);
  }

  onFilterCategory(cat: string): void {
    this.store.setFilterCategory(cat);
  }

  onAddProduct(): void {
    const ref = this.dialog.open(ProductDialogComponent, {
      width: '520px',
      data: { mode: 'create' },
    });
    ref.afterClosed().subscribe(async (result) => {
      if (result) await this.store.createProduct(result);
    });
  }

  onEditProduct(product: Product): void {
    const ref = this.dialog.open(ProductDialogComponent, {
      width: '520px',
      data: { mode: 'edit', product },
    });
    ref.afterClosed().subscribe(async (result) => {
      if (result) await this.store.updateProduct(product.id, result);
    });
  }

  async onDeleteProduct(product: Product): Promise<void> {
    if (!confirm(`Supprimer "${product.name}" ?`)) return;
    await this.store.deleteProduct(product.id);
  }

  getCategoryLabel(cat: string): string {
    return this.categories.find(c => c.value === cat)?.label ?? cat;
  }

  getMargin(product: Product): number {
    if (product.sell_price <= 0) return 0;
    return Math.round(((product.sell_price - product.purchase_price) / product.sell_price) * 100);
  }

  formatPrice(amount: number): string {
    return amount.toFixed(2);
  }
}
