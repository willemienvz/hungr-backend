import { Special } from '../../types/special';
import { SpecialType } from '../components/specials/shared/special-types.constants';

export function isSpecial(data: any): data is Special {
  return (
    typeof data.specialID === 'string' &&
    typeof data.specialTitle === 'string' &&
    typeof data.imageUrl === 'string' &&
    Array.isArray(data.selectedDays) &&
    (typeof data.timeFrom === 'string' || typeof data.timeFrom === 'undefined') &&
    (typeof data.timeTo === 'string' || typeof data.timeTo === 'undefined') &&
    (typeof data.typeSpecial === 'number' || Object.values(SpecialType).includes(data.typeSpecial)) &&
    typeof data.active === 'boolean' &&
    typeof data.isDraft === 'boolean' &&
    typeof data.OwnerID === 'string' &&
    Array.isArray(data.addedItems) &&
    data.addedItems.every((item: any) => typeof item.name === 'string' && typeof item.amount === 'string')
  );
}