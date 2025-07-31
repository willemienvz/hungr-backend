import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-step5-overview',
  templateUrl: './step5-overview.component.html',
  styleUrls: ['./step5-overview.component.scss']
})
export class Step5OverviewComponent {
  @Input() specialForm!: FormGroup;
  @Input() selectedSpecialType: number = 1;
  @Input() selectedDays: string[] = [];
  @Input() addedItems: { name: string; amount: string }[] = [];
  @Input() isSaving: boolean = false;
  @Input() editMode: boolean = false;

  getSpecialTypeLabel(type: number): string {
    switch (type) {
      case 1: return 'Percentage Discount';
      case 2: return 'Price Discount';
      case 3: return 'Combo Deal';
      case 4: return 'Category Special';
      default: return 'Special Type';
    }
  }
} 