import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Restaurant } from '../../../shared/services/restaurant';

@Component({
  selector: 'app-menu-form-step',
  templateUrl: './menu-form-step.component.html',
  styleUrls: ['./menu-form-step.component.scss']
})
export class MenuFormStepComponent {
  @Input() menuName: string = '';
  @Input() selectedRestaurant: string = '';
  @Input() restaurants: Restaurant[] = [];
  @Input() menuNameError: boolean = false;
  @Input() restaurantError: boolean = false;
  @Input() showAddRestaurantLink: boolean = true;
  @Input() currentStep: number = 1;
  @Input() addRestaurantLater: boolean = false;
  @Input() isDuplicateMenuName: boolean = false;

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
} 