import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Menu } from '../../../../../shared/services/menu';

@Component({
  selector: 'app-step1-special-basics',
  templateUrl: './step1-special-basics.component.html',
  styleUrls: ['./step1-special-basics.component.scss']
})
export class Step1SpecialBasicsComponent {
  @Input() specialForm!: FormGroup;
  @Input() menus: Menu[] = [];
  @Input() specialTypes: any[] = [];
  @Input() selectedMenu: Menu | null = null;
  @Input() isSaving: boolean = false;

  @Output() menuChange = new EventEmitter<void>();
  @Output() specialTypeChange = new EventEmitter<void>();

  onMenuChange() {
    this.menuChange.emit();
  }

  onSpecialTypeChange() {
    this.specialTypeChange.emit();
  }
} 