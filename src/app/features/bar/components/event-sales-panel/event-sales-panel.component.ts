import { Component, inject, input, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BarStore } from '../../bar.store';
import { Product } from '../../bar.model';

@Component({
  selector: 'app-event-sales-panel',
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
  ],
  providers: [BarStore],
  templateUrl: './event-sales-panel.component.html',
  styleUrl: './event-sales-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventSalesPanelComponent implements OnInit {
  readonly store = inject(BarStore);

  eventId = input.required<string>();

  // Form for adding a sale
  selectedProduct = signal<string>('');
  quantity = signal<number>(0);
  unitPrice = signal<number>(0);

  availableProducts = computed(() =>
    this.store.activeProducts().filter(p => {
      const existingSale = this.store.sales().find(s => s.product_id === p.id);
      return !existingSale;
    })
  );

  ngOnInit(): void {
    this.store.loadEventSales(this.eventId());
  }

  onProductSelected(productId: string): void {
    this.selectedProduct.set(productId);
    const product = this.store.products().find(p => p.id === productId);
    if (product) {
      this.unitPrice.set(product.sell_price);
    }
  }

  async onAddSale(): Promise<void> {
    const productId = this.selectedProduct();
    const qty = this.quantity();
    if (!productId || qty <= 0) return;

    await this.store.upsertSale({
      event_id: this.eventId(),
      product_id: productId,
      quantity_sold: qty,
      unit_price: this.unitPrice(),
    });

    this.selectedProduct.set('');
    this.quantity.set(0);
    this.unitPrice.set(0);
  }

  async onRemoveSale(saleId: string): Promise<void> {
    await this.store.deleteSale(saleId);
  }

  async onUpdateQuantity(saleId: string, productId: string, qty: number, price: number): Promise<void> {
    if (qty <= 0) return;
    await this.store.upsertSale({
      event_id: this.eventId(),
      product_id: productId,
      quantity_sold: qty,
      unit_price: price,
    });
  }

  formatPrice(amount: number): string {
    return amount.toFixed(2);
  }

  getProductName(productId: string): string {
    return this.store.products().find(p => p.id === productId)?.name ?? '';
  }
}
