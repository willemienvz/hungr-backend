import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { SPECIAL_TYPE_OPTIONS, SpecialTypeOption, SpecialType } from '../../../shared/special-types.constants';
import { AddedItem } from '../../../../../types/special';

@Component({
  selector: 'app-step5-overview',
  templateUrl: './step5-overview.component.html',
  styleUrls: ['./step5-overview.component.scss']
})
export class Step5OverviewComponent {
  @Input() specialForm!: FormGroup;
  @Input() selectedSpecialType!: SpecialType;
  @Input() selectedMenu: any = null;
  @Input() addedItems: AddedItem[] = [];
  @Input() selectedDays: string[] = [];
  @Input() uploadedImageUrl: string | null = null;
  @Input() selectedMediaItem: any = null;
  @Input() isSaving: boolean = false;
  @Input() editMode: boolean = false;

  // Make SpecialType available in template
  SpecialType = SpecialType;

  getSpecialTypeLabel(type: SpecialType): string {
    switch (type) {
      case SpecialType.PERCENTAGE_DISCOUNT: return 'Percentage Discount';
      case SpecialType.PRICE_DISCOUNT: return 'Price Discount';
      case SpecialType.COMBO_DEAL: return 'Combo Deal';
      case SpecialType.CATEGORY_SPECIAL: return 'Category Special';
      default: return 'Special Type';
    }
  }

  getPromotionalLabel(): string {
    if (this.selectedSpecialType === SpecialType.PERCENTAGE_DISCOUNT) {
      return 'Promotional Discount';
    }
    return 'Promotional Price';
  }
} 