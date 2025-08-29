import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { SPECIAL_TYPE_OPTIONS, SpecialTypeOption, SpecialType } from '../../../shared/special-types.constants';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, Subject } from 'rxjs';
import { startWith, map, takeUntil } from 'rxjs/operators';
import { AddedItem, Category } from '../../../../../types/special';
import { CategoryService } from '../../../../../services/category.service';

@Component({
  selector: 'app-step3-special-details',
  templateUrl: './step3-special-details.component.html',
  styleUrls: ['./step3-special-details.component.scss']
})
export class Step3SpecialDetailsComponent implements OnInit, OnDestroy {
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

  constructor(private categoryService: CategoryService) { }

  displayFn = (item: any): string => {
    return item && item.name ? item.name : '';
  }

  onMenuItemSelected(event: MatAutocompleteSelectedEvent) {
    this.menuItemSelected.emit(event);
  }

  onAddItem() {
    this.addItem.emit();
  }

  onRemoveItem(index: number) {
    this.removeItem.emit(index);
  }

  ngOnInit() {
    // Load categories when component initializes
    this.loadCategories();

    // Set default discount type for category specials
    if (this.selectedSpecialType === SpecialType.CATEGORY_SPECIAL) {
      if (!this.specialForm.get('discountType')?.value) {
        this.specialForm.patchValue({ discountType: 'percentage' });
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
    } catch (error) {
      console.error('Failed to load categories:', error);
      this.availableCategories = [];
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