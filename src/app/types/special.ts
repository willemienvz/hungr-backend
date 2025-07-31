export interface Special {
  specialID: string;
  specialTitle: string;
  imageUrl: string;
  selectedDays: string[];
  timeFrom?: string;
  timeTo?: string;
  typeSpecial: number;
  active: boolean;
  isDraft: boolean;
  OwnerID: string;
  addedItems: { name: string; amount: string }[];
} 