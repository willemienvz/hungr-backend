import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Menu } from '../../../../../shared/services/menu';
import { SelectOption } from '../../../../shared/form-select/form-select.component';

@Component({
  selector: 'app-step1-special-basics',
  templateUrl: './step1-special-basics.component.html',
  styleUrls: ['./step1-special-basics.component.scss']
})
export class Step1SpecialBasicsComponent implements OnInit, OnChanges {
  @Input() specialForm!: FormGroup;
  @Input() menus: Menu[] = [];
  @Input() specialTypes: any[] = [];
  @Input() selectedMenu: Menu | null = null;
  @Input() isSaving: boolean = false;

  @Output() menuChange = new EventEmitter<void>();
  @Output() specialTypeChange = new EventEmitter<void>();

  // Convert getters to properties to prevent infinite change detection loops
  menuOptions: SelectOption[] = [];
  specialTypeOptions: SelectOption[] = [];

  ngOnInit(): void {
    // Initialize options on component init
    this.updateMenuOptions();
    this.updateSpecialTypeOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update options when inputs change
    if (changes['menus'] && this.menus) {
      this.updateMenuOptions();
    }
    if (changes['specialTypes'] && this.specialTypes) {
      this.updateSpecialTypeOptions();
    }
  }

  private updateMenuOptions(): void {
    this.menuOptions = this.menus.map(menu => ({
      value: menu.menuID,
      label: menu.menuName
    }));
  }

  private updateSpecialTypeOptions(): void {
    this.specialTypeOptions = this.specialTypes.map(type => ({
      value: type.id,
      label: type.name
    }));
  }

  onMenuChange() {
    this.menuChange.emit();
  }

  onSpecialTypeChange() {
    this.specialTypeChange.emit();
  }
} 