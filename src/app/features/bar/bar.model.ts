// ── Product categories ──
export type ProductCategory = 'boisson' | 'spiritueux' | 'soft' | 'snack' | 'autre';

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'boisson', label: 'Boisson' },
  { value: 'spiritueux', label: 'Spiritueux' },
  { value: 'soft', label: 'Soft / Sans alcool' },
  { value: 'snack', label: 'Snack' },
  { value: 'autre', label: 'Autre' },
];

// ── Domain models ──
export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  purchase_price: number;
  sell_price: number;
  stock: number;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface EventSale {
  id: string;
  event_id: string;
  product_id: string;
  quantity_sold: number;
  unit_price: number;
  notes: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  product?: Product;
}

// ── Stats ──
export interface BarStats {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  marginPercent: number;
  totalItemsSold: number;
  topProduct: string | null;
}

// ── DTOs ──
export interface CreateProductDto {
  name: string;
  category?: ProductCategory;
  purchase_price?: number;
  sell_price?: number;
  stock?: number;
  unit?: string;
  image_url?: string | null;
  is_active?: boolean;
  notes?: string;
}

export interface CreateEventSaleDto {
  event_id: string;
  product_id: string;
  quantity_sold: number;
  unit_price: number;
  notes?: string;
}
