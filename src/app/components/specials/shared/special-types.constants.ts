// Special type dropdown options for Add/Edit Special (shared)
// Order: Percentage Discount, Price Discount, Combo Deal, Category Special
export interface SpecialTypeOption {
  id: number;
  name: string;
}

export const SPECIAL_TYPE_OPTIONS: SpecialTypeOption[] = [
  { id: 1, name: 'Percentage Discount' },
  { id: 2, name: 'Price Discount' },
  { id: 3, name: 'Combo Deal' },
  { id: 4, name: 'Category Special' },
]; 