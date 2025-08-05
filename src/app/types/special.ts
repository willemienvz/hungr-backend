import { MediaItem } from '../shared/types/media';

export interface Special {
  specialID: string;
  specialTitle: string;
  imageUrl: string; // Legacy field - maintained for backward compatibility
  mediaId?: string; // New field - reference to media library item
  mediaItem?: MediaItem; // New field - populated media item data
  selectedDays: string[];
  timeFrom?: string;
  timeTo?: string;
  typeSpecial: number;
  active: boolean;
  isDraft: boolean;
  OwnerID: string;
  addedItems: { name: string; amount: string }[];
} 