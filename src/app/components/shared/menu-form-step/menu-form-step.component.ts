import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { Restaurant } from '../../../shared/services/restaurant';
import { SelectOption } from '../form-select/form-select.component';

@Component({
  selector: 'app-menu-form-step',
  templateUrl: './menu-form-step.component.html',
  styleUrls: ['./menu-form-step.component.scss']
})
export class MenuFormStepComponent implements OnInit, OnChanges {
  @Input() menuName: string = '';
  @Input() selectedRestaurant: string = '';
  @Input() restaurants: Restaurant[] = [];
  @Input() menuNameError: boolean = false;
  @Input() restaurantError: boolean = false;
  @Input() showAddRestaurantLink: boolean = true;
  @Input() currentStep: number = 1;
  @Input() addRestaurantLater: boolean = false;
  @Input() isDuplicateMenuName: boolean = false;

  restaurantOptions: SelectOption[] = [];

  @Output() menuNameChange = new EventEmitter<string>();
  @Output() selectedRestaurantChange = new EventEmitter<string>();
  @Output() validateMenuName = new EventEmitter<void>();
  @Output() validateRestaurant = new EventEmitter<void>();
  @Output() addRestaurantClick = new EventEmitter<Event>();
  @Output() addRestaurantLaterChange = new EventEmitter<boolean>();

  onMenuNameChange(value: string) {
    this.menuNameChange.emit(value);
  }

  onSelectedRestaurantChange(value: string) {
    this.selectedRestaurantChange.emit(value);
  }

  onValidateMenuName() {
    this.validateMenuName.emit();
  }

  onValidateRestaurant() {
    this.validateRestaurant.emit();
  }

  onAddRestaurantClick(event: Event) {
    this.addRestaurantClick.emit(event);
  }

  onAddRestaurantLaterChange(checked: boolean) {
    this.addRestaurantLaterChange.emit(checked);
  }

  ngOnInit() {
    this.initializeRestaurantOptions();
  }

  ngOnChanges() {
    this.initializeRestaurantOptions();
  }

  private initializeRestaurantOptions() {
    this.restaurantOptions = [
      { value: '', label: 'Assign your menu to a restaurant', disabled: true },
      ...this.restaurants.map(restaurant => ({
        value: restaurant.restaurantID,
        label: restaurant.restaurantName
      })),
      { value: 'later', label: 'Add restaurant later' }
    ];
  }

  getMenuNameError(): string {
    if (this.isDuplicateMenuName) {
      return 'A menu with this name already exists. Please choose a different name.';
    }
    if (this.menuNameError) {
      return 'Menu name is required.';
    }
    return '';
  }

  getRestaurantError(): string {
    if (this.restaurantError) {
      return 'Restaurant selection is required.';
    }
    return '';
  }
} 