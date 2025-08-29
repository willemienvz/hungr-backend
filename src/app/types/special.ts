import { MediaItem } from '../shared/types/media';

// Import the SpecialType enum from the constants file
import { SpecialType } from '../components/specials/shared/special-types.constants';

// Interface for added items with enhanced ID support
export interface AddedItem {
  name: string;
  amount: string;
  itemId?: string; // For individual item specials
  categoryId?: string; // For category specials
  comboItemIds?: string[]; // For combo specials - can contain item IDs or names
  comboItemNames?: string[]; // For combo specials - item names for display
  discountType?: 'percentage' | 'fixed'; // For category specials
  selectedCategories?: string[]; // For category specials - multiple categories
}

// Category interface for category selection
export interface Category {
  id: string;
  name: string;
  description?: string;
  itemCount?: number;
}

export interface Special {
  specialID: string;
  specialTitle: string;
  imageUrl: string; // Legacy field - maintained for backward compatibility
  mediaId?: string; // New field - reference to media library item
  mediaItem?: MediaItem; // New field - populated media item data
  selectedDays: string[];
  timeFrom?: string;
  timeTo?: string;
  typeSpecial: SpecialType;
  active: boolean;
  isDraft: boolean;
  OwnerID: string;
  addedItems: AddedItem[]; // Updated to use enhanced interface
  customPromotionalText?: string; // New field for combo and category specials
  selectedCategories?: string[]; // New field for category specials - multiple categories
  discountType?: 'percentage' | 'fixed'; // New field for category specials
} 