import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Menu } from '../../../../../shared/services/menu';
import { Observable } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Component({
  selector: 'app-step3-special-details',
  templateUrl: './step3-special-details.component.html',
  styleUrls: ['./step3-special-details.component.scss']
})
export class Step3SpecialDetailsComponent {
  @Input() specialForm!: FormGroup;
  @Input() selectedMenu: Menu | null = null;
  @Input() selectedSpecialType: number = 1;
  @Input() addedItems: { name: string; amount: string }[] = [];
  @Input() menuItemAutocompleteControl!: FormControl;
  @Input() filteredMenuItems!: Observable<any[]>;
  @Input() isSaving: boolean = false;
  @Input() editMode: boolean = false;

  @Output() menuItemSelected = new EventEmitter<MatAutocompleteSelectedEvent>();
  @Output() addItem = new EventEmitter<void>();
  @Output() removeItem = new EventEmitter<number>();

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
} 