import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-step2-days-times',
  templateUrl: './step2-days-times.component.html',
  styleUrls: ['./step2-days-times.component.scss']
})
export class Step2DaysTimesComponent {
  @Input() specialForm!: FormGroup;
  @Input() weekdays: string[] = [];
  @Input() selectedDays: string[] = [];
  @Input() isSaving: boolean = false;

  @Output() toggleSelection = new EventEmitter<string>();
  @Output() previous = new EventEmitter<void>();
  @Output() draft = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  isSelected(day: string): boolean {
    return this.selectedDays.includes(day);
  }

  onToggleSelection(day: string) {
    this.toggleSelection.emit(day);
  }

  onPrevious() {
    this.previous.emit();
  }

  onDraft() {
    this.draft.emit();
  }

  onNext() {
    this.next.emit();
  }
} 