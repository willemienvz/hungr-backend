import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-step-navigation',
  templateUrl: './step-navigation.component.html',
  styleUrls: ['./step-navigation.component.scss']
})
export class StepNavigationComponent {
  @Input() showCancel: boolean = true;
  @Input() showDraft: boolean = false;
  @Input() showPublish: boolean = false;
  @Input() showSubmit: boolean = false;
  @Input() set showNext(value: boolean) {
    console.log('StepNavigation: showNext set to:', value);
    this._showNext = value;
  }
  get showNext(): boolean {
    return this._showNext;
  }
  private _showNext: boolean = true;
  @Input() showPrevious: boolean = false;
  @Input() showDone: boolean = false;
  @Input() nextDisabled: boolean = false;
  @Input() nextText: string = 'Next';
  @Input() submitText: string = 'Submit';
  @Input() cancelRoute: string = '/menus';
  @Input() isSaving: boolean = false;
  @Input() isLoading: boolean = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() draft = new EventEmitter<void>();
  @Output() publish = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() done = new EventEmitter<void>();

  get isDisabled(): boolean {
    return this.isSaving || this.isLoading;
  }

  onCancel() {
    this.cancel.emit();
  }

  onDraft() {
    this.draft.emit();
  }

  onPublish() {
    this.publish.emit();
  }

  onSubmit() {
    this.submit.emit();
  }

  onNext() {
    this.next.emit();
  }

  onPrevious() {
    this.previous.emit();
  }

  onDone() {
    this.done.emit();
  }
} 