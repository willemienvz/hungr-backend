import { Special } from '../../types/special';

export function isSpecial(data: any): data is Special {
  return (
    typeof data.specialID === 'string' &&
    typeof data.specialTitle === 'string' &&
    typeof data.imageUrl === 'string' &&
    Array.isArray(data.selectedDays) &&
    (typeof data.timeFrom === 'string' || typeof data.timeFrom === 'undefined') &&
    (typeof data.timeTo === 'string' || typeof data.timeTo === 'undefined') &&
    typeof data.typeSpecial === 'number' &&
    typeof data.active === 'boolean' &&
    typeof data.isDraft === 'boolean' &&
    typeof data.OwnerID === 'string' &&
    Array.isArray(data.addedItems) &&
    data.addedItems.every((item: any) => typeof item.name === 'string' && typeof item.amount === 'string')
  );
}