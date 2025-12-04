import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { SelectOption } from '../form-select/form-select.component';

@Component({
  selector: 'app-content-block',
  templateUrl: './content-block.component.html',
  styleUrls: ['./content-block.component.scss']
})
export class ContentBlockComponent {
  @Input() title: string = '';
  @Input() showHeader: boolean = true;
  @Input() showActions: boolean = false;
  @Input() actions: any[] = [];
  @Input() filterOptions: any[] = [];
  @Input() selectedFilter: string = '';
  @Input() showFilter: boolean = false;
  @Input() customClass: string = '';
  @Input() class: string = '';
  @Input() tooltipText?: string;
  @Input() showBackButton: boolean = false;
  @Input() backButtonText: string = 'Back';
  @Input() backRoute?: string;
  
  @Output() filterChange = new EventEmitter<string>();
  @Output() actionClick = new EventEmitter<any>();
  @Output() backButtonClick = new EventEmitter<void>();

  constructor(private router: Router) {}

  onFilterChange(value: string) {
    this.filterChange.emit(value);
  }

  onActionClick(action: any) {
    this.actionClick.emit(action);
  }

  onBackButtonClick(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    
    // Check if parent component is handling the back button click
    if (this.backButtonClick.observers.length > 0) {
      // Parent component is listening, let it handle the navigation
      this.backButtonClick.emit();
    } else if (this.backRoute) {
      // No parent handler, navigate directly using backRoute
      this.router.navigate([this.backRoute]);
    }
  }

  // Get filter options for app-form-select
  get filterSelectOptions(): SelectOption[] {
    return this.filterOptions.map(option => ({
      value: option.value,
      label: option.label
    }));
  }
} 