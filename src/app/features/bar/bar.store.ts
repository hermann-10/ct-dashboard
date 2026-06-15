import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { SupabaseService } from '../../core/services/supabase.service';
import { Product, EventSale, BarStats, CreateProductDto, CreateEventSaleDto } from './bar.model';

interface BarState {
  products: Product[];
  sales: EventSale[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  searchTerm: string;
  filterCategory: string;
}

const initialState: BarState = {
  products: [],
  sales: [],
  loading: false,
  saving: false,
  error: null,
  searchTerm: '',
  filterCategory: '',
};

export const BarStore = signalStore(
  withState(initialState),

  withComputed((state) => ({
    activeProducts: computed(() =>
      state.products().filter(p => p.is_active)
    ),

    filteredProducts: computed(() => {
      let list = state.products();
      const term = state.searchTerm().toLowerCase();
      const cat = state.filterCategory();
      if (term) {
        list = list.filter(p => p.name.toLowerCase().includes(term));
      }
      if (cat) {
        list = list.filter(p => p.category === cat);
      }
      return list;
    }),

    salesStats: computed((): BarStats => {
      const sales = state.sales();
      const totalRevenue = sales.reduce((s, sl) => s + sl.quantity_sold * sl.unit_price, 0);
      const totalCost = sales.reduce((s, sl) => {
        const purchasePrice = sl.product?.purchase_price ?? 0;
        return s + sl.quantity_sold * purchasePrice;
      }, 0);
      const totalProfit = totalRevenue - totalCost;
      const totalItems = sales.reduce((s, sl) => s + sl.quantity_sold, 0);

      // Top product by revenue
      let topProduct: string | null = null;
      let topRevenue = 0;
      for (const sl of sales) {
        const rev = sl.quantity_sold * sl.unit_price;
        if (rev > topRevenue) {
          topRevenue = rev;
          topProduct = sl.product?.name ?? null;
        }
      }

      return {
        totalRevenue,
        totalCost,
        totalProfit,
        marginPercent: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0,
        totalItemsSold: totalItems,
        topProduct,
      };
    }),
  })),

  withMethods((store) => {
    const supabase = inject(SupabaseService);

    return {
      setSearch(term: string): void {
        patchState(store, { searchTerm: term });
      },

      setFilterCategory(cat: string): void {
        patchState(store, { filterCategory: cat });
      },

      async loadProducts(): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const data = await supabase.getProducts();
          patchState(store, { products: data as Product[], loading: false });
        } catch (e: any) {
          patchState(store, { error: e.message, loading: false });
        }
      },

      async createProduct(dto: CreateProductDto): Promise<Product | null> {
        patchState(store, { saving: true });
        try {
          const created = await supabase.createProduct(dto);
          patchState(store, {
            products: [...store.products(), created as Product].sort((a, b) =>
              a.name.localeCompare(b.name, 'fr')
            ),
            saving: false,
          });
          return created as Product;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return null;
        }
      },

      async updateProduct(id: string, changes: Partial<CreateProductDto>): Promise<boolean> {
        patchState(store, { saving: true });
        try {
          const updated = await supabase.updateProduct(id, changes);
          patchState(store, {
            products: store.products().map(p => p.id === id ? (updated as Product) : p),
            saving: false,
          });
          return true;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return false;
        }
      },

      async deleteProduct(id: string): Promise<boolean> {
        patchState(store, { saving: true });
        try {
          await supabase.deleteProduct(id);
          patchState(store, {
            products: store.products().filter(p => p.id !== id),
            saving: false,
          });
          return true;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return false;
        }
      },

      async loadEventSales(eventId: string): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const [products, sales] = await Promise.all([
            supabase.getProducts(),
            supabase.getEventSales(eventId),
          ]);
          patchState(store, {
            products: products as Product[],
            sales: sales as EventSale[],
            loading: false,
          });
        } catch (e: any) {
          patchState(store, { error: e.message, loading: false });
        }
      },

      async upsertSale(dto: CreateEventSaleDto): Promise<boolean> {
        patchState(store, { saving: true });
        try {
          const result = await supabase.upsertEventSale(dto);
          const existing = store.sales().find(s => s.product_id === dto.product_id && s.event_id === dto.event_id);
          if (existing) {
            patchState(store, {
              sales: store.sales().map(s => s.id === existing.id ? (result as EventSale) : s),
              saving: false,
            });
          } else {
            patchState(store, {
              sales: [...store.sales(), result as EventSale],
              saving: false,
            });
          }
          return true;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return false;
        }
      },

      async deleteSale(id: string): Promise<boolean> {
        patchState(store, { saving: true });
        try {
          await supabase.deleteEventSale(id);
          patchState(store, {
            sales: store.sales().filter(s => s.id !== id),
            saving: false,
          });
          return true;
        } catch (e: any) {
          patchState(store, { error: e.message, saving: false });
          return false;
        }
      },
    };
  })
);
