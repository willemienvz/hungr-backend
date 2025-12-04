import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { SPECIAL_TYPE_OPTIONS, SpecialTypeOption, SpecialType } from '../../../shared/special-types.constants';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, Subject } from 'rxjs';
import { startWith, map, takeUntil } from 'rxjs/operators';
import { AddedItem, Category } from '../../../../../types/special';
import { CategoryService } from '../../../../../services/category.service';
import { SelectOption } from '../../../../shared/form-select/form-select.component';

@Component({
  selector: 'app-step3-special-details',
  templateUrl: './step3-special-details.component.html',
  styleUrls: ['./step3-special-details.component.scss']
})
export class Step3SpecialDetailsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() specialForm!: FormGroup;
  @Input() selectedSpecialType!: SpecialType;
  @Input() selectedMenu: any = null;
  @Input() addedItems: AddedItem[] = [];
  @Input() selectedDays: string[] = [];
  @Input() menuItemAutocompleteControl!: FormControl;
  @Input() filteredMenuItems!: Observable<any[]>;
  @Input() isSaving: boolean = false;
  @Input() editMode: boolean = false;
  @Output() addItem = new EventEmitter<void>();
  @Output() removeItem = new EventEmitter<number>();
  @Output() dayToggle = new EventEmitter<string>();
  @Output() menuItemSelected = new EventEmitter<MatAutocompleteSelectedEvent>();

  // Make SpecialType available in template
  SpecialType = SpecialType;

  // Category management
  availableCategories: Category[] = [];
  private destroy$ = new Subject<void>();

  // Cached options to prevent recalculation on every change detection
  menuItemOptions: SelectOption[] = [];
  categoryOptions: SelectOption[] = [];
  discountTypeOptions: SelectOption[] = [
    { value: 'percentage', label: 'Percentage Discount' },
    { value: 'fixed', label: 'Fixed Amount Discount' }
  ];

  constructor(private categoryService: CategoryService) { }

  displayFn = (item: any): string => {
    return item && item.name ? item.name : '';
  }

  onMenuItemSelected(event: MatAutocompleteSelectedEvent) {
    this.menuItemSelected.emit(event);
  }

  onAddItem() {
    // Use canAddItem() to validate all special types
    if (this.canAddItem()) {
      this.addItem.emit();
    }
  }

  isMenuItemSelected(): boolean {
    const value = this.menuItemAutocompleteControl?.value;
    // Check if value is an object (menu item selected) not a string (just typed text)
    return value && typeof value === 'object' && value.name;
  }

  hasValidPercentage(): boolean {
    const percentage = this.specialForm.get('percentage')?.value;
    return percentage !== null && percentage !== undefined && percentage !== '' && !this.specialForm.get('percentage')?.invalid;
  }

  hasValidAmount(): boolean {
    const amount = this.specialForm.get('amount')?.value;
    return amount !== null && amount !== undefined && amount !== '' && !this.specialForm.get('amount')?.invalid;
  }

  hasSelectedCategories(): boolean {
    const category = this.specialForm.get('selectedCategory')?.value;
    return category !== null && category !== undefined && category !== '';
  }

  setDiscountType(type: 'percentage' | 'fixed'): void {
    this.specialForm.patchValue({ discountType: type });
    // Reset amount when switching discount types
    this.specialForm.patchValue({ amount: '' });
  }

  hasSelectedComboItems(): boolean {
    const comboItems = this.specialForm.get('typeSpecialDetails')?.value;
    return comboItems && Array.isArray(comboItems) && comboItems.length > 0;
  }

  canAddItem(): boolean {
    if (this.selectedSpecialType === SpecialType.PERCENTAGE_DISCOUNT) {
      return this.isMenuItemSelected() && this.hasValidPercentage();
    } else if (this.selectedSpecialType === SpecialType.PRICE_DISCOUNT) {
      return this.isMenuItemSelected() && this.hasValidAmount();
    } else if (this.selectedSpecialType === SpecialType.CATEGORY_SPECIAL) {
      // Category Special uses 'amount' field for both percentage and fixed discount
      return this.hasSelectedCategories() && this.hasValidAmount();
    } else if (this.selectedSpecialType === SpecialType.COMBO_DEAL) {
      return this.hasSelectedComboItems() && this.hasValidPercentage();
    }
    return false;
  }

  onRemoveItem(index: number) {
    this.removeItem.emit(index);
  }

  ngOnInit() {
    // Load categories when component initializes
    this.loadCategories();
    this.updateOptions();

    // Set default discount type for category specials
    if (this.selectedSpecialType === SpecialType.CATEGORY_SPECIAL) {
      if (!this.specialForm.get('discountType')?.value) {
        this.specialForm.patchValue({ discountType: 'percentage' });
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Update options when inputs change
    if (changes['selectedMenu'] || changes['availableCategories']) {
      this.updateOptions();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateOptions() {
    // Update menu item options
    if (this.selectedMenu?.items) {
      this.menuItemOptions = this.selectedMenu.items.map((item: any) => ({
        value: item.name,
        label: item.name
      }));
    } else {
      this.menuItemOptions = [];
    }

    // Update category options
    this.categoryOptions = this.availableCategories.map(category => ({
      value: category.id,
      label: `${category.name} (${category.itemCount || 0} items)`
    }));
  }

  private loadCategories() {
    if (!this.selectedMenu) {
      this.availableCategories = [];
      return;
    }

    try {
      // Try to get categories from the selected menu first
      if (this.selectedMenu.categories && Array.isArray(this.selectedMenu.categories)) {
        this.availableCategories = this.selectedMenu.categories.map((category: any) => ({
          id: category.id || category.name,
          name: category.name,
          description: category.description,
          itemCount: this.getCategoryItemCount(category)
        }));
      } else {
        // Fallback: extract categories from menu items using the service
        this.availableCategories = this.categoryService.extractCategoriesFromMenuItems(this.selectedMenu.items || []);
      }
      // Update options after loading categories
      this.updateOptions();
    } catch (error) {
      console.error('Failed to load categories:', error);
      this.availableCategories = [];
      this.updateOptions();
    }
  }

  private getCategoryItemCount(category: any): number {
    if (!this.selectedMenu?.items) {
      return 0;
    }

    const categoryId = category.id || category.name;
    return this.selectedMenu.items.filter((item: any) =>
      (item.categoryId || item.category) === categoryId
    ).length;
  }
} 