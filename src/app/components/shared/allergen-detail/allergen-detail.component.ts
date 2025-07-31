import { Component, Input, Output, EventEmitter } from '@angular/core';

/* KB: Configuration interface for allergen detail component */
export interface AllergenDetailConfig {
  title: string;
  placeholder: string;
  description?: string;
}

@Component({
  selector: 'app-allergen-detail',
  templateUrl: './allergen-detail.component.html',
  styleUrls: ['./allergen-detail.component.scss']
})
export class AllergenDetailComponent {
  /* KB: Configuration object that defines the allergen detail behavior */
  @Input() config!: AllergenDetailConfig;
  
  /* KB: Array of allergen items */
  @Input() allergens: string[] = [];
  
  /* KB: Current value of the new allergen input */
  @Input() newAllergen: string = '';
  
  /* KB: Event emitted when user wants to close this detail section */
  @Output() closeDetail = new EventEmitter<void>();
  
  /* KB: Event emitted when user adds a new allergen */
  @Output() addAllergen = new EventEmitter<string>();
  
  /* KB: Event emitted when user removes an allergen at specific index */
  @Output() removeAllergen = new EventEmitter<number>();
  
  /* KB: Event emitted when the new allergen input value changes */
  @Output() newAllergenChange = new EventEmitter<string>();

  /* KB: Handle closing the detail section */
  onCloseDetail() {
    this.closeDetail.emit();
  }

  /* KB: Handle adding a new allergen */
  onAddAllergen() {
    if (this.newAllergen.trim()) {
      this.addAllergen.emit(this.newAllergen.trim());
      // Reset input
      this.newAllergen = '';
    }
  }

  /* KB: Handle removing an allergen at specific index */
  onRemoveAllergen(index: number) {
    this.removeAllergen.emit(index);
  }

  /* KB: Handle new allergen input value changes */
  onNewAllergenChange(value: string) {
    this.newAllergenChange.emit(value);
  }
} 