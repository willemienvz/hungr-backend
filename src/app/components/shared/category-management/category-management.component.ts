import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Category } from '../../../shared/services/category';

@Component({
  selector: 'app-category-management',
  templateUrl: './category-management.component.html',
  styleUrls: ['./category-management.component.scss']
})
export class CategoryManagementComponent {
  @Input() categories: Category[] = [];
  @Input() newCategoryName: string = '';
  @Input() newSubcategoryName: string[] = [];
  @Input() isPopupMenuOpen: boolean[] = [];
  @Input() isAddInputVisible: boolean[] = [];
  @Input() currentStep: number = 2;
  @Input() stepTitle: string = 'Create your menu categories';

  @Output() categoriesChange = new EventEmitter<Category[]>();
  @Output() newCategoryNameChange = new EventEmitter<string>();
  @Output() newSubcategoryNameChange = new EventEmitter<string[]>();
  @Output() isPopupMenuOpenChange = new EventEmitter<boolean[]>();
  @Output() isAddInputVisibleChange = new EventEmitter<boolean[]>();
  @Output() addCategory = new EventEmitter<void>();
  @Output() addSubCategory = new EventEmitter<number>();
  @Output() deleteCategory = new EventEmitter<number>();
  @Output() deleteSubCategory = new EventEmitter<{categoryIndex: number, subcategoryIndex: number}>();
  @Output() togglePopupMenu = new EventEmitter<number>();

  onNewCategoryNameChange(value: string) {
    this.newCategoryNameChange.emit(value);
  }

  onNewSubcategoryNameChange(index: number, value: string) {
    const updatedArray = [...this.newSubcategoryName];
    updatedArray[index] = value;
    this.newSubcategoryNameChange.emit(updatedArray);
  }

  onAddCategory() {
    this.addCategory.emit();
  }

  onAddSubCategory(index: number) {
    this.addSubCategory.emit(index);
  }

  onDeleteCategory(index: number) {
    this.deleteCategory.emit(index);
  }

  onDeleteSubCategory(categoryIndex: number, subcategoryIndex: number) {
    this.deleteSubCategory.emit({categoryIndex, subcategoryIndex});
  }

  onTogglePopupMenu(index: number) {
    this.togglePopupMenu.emit(index);
  }
} 