// Special type enum for Add/Edit Special (shared)
export enum SpecialType {
  PERCENTAGE_DISCOUNT = 1,
  PRICE_DISCOUNT = 2,
  COMBO_DEAL = 3,
  CATEGORY_SPECIAL = 4
}

// Special type dropdown options for Add/Edit Special (shared)
// Order: Percentage Discount, Price Discount, Combo Deal, Category Special
export interface SpecialTypeOption {
  id: SpecialType;
  name: string;
}

export const SPECIAL_TYPE_OPTIONS: SpecialTypeOption[] = [
  { id: SpecialType.PERCENTAGE_DISCOUNT, name: 'Percentage Discount' },
  { id: SpecialType.PRICE_DISCOUNT, name: 'Price Discount' },
  { id: SpecialType.COMBO_DEAL, name: 'Combo Deal' },
  { id: SpecialType.CATEGORY_SPECIAL, name: 'Category Special' },
]; 