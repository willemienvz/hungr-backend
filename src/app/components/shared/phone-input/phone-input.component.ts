import { Component, Input, Output, EventEmitter, forwardRef, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, AbstractControl, ValidationErrors, Validator, NG_VALIDATORS } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-phone-input',
  templateUrl: './phone-input.component.html',
  styleUrls: ['./phone-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ]
})
export class PhoneInputComponent implements ControlValueAccessor, Validator, OnDestroy {
  @Input() label: string = 'Cellphone number';
  @Input() placeholder: string = '+27 12 234 5678';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() errorMessage: string = '';

  @Output() valueChange = new EventEmitter<string>();

  value: string = '+27';
  private onChange = (value: string) => { };
  private onTouched = () => { };
  private valueChangeSubscription?: Subscription;

  ngOnDestroy(): void {
    if (this.valueChangeSubscription) {
      this.valueChangeSubscription.unsubscribe();
    }
  }

  writeValue(value: string): void {
    if (value) {
      this.value = this.formatCellphone(value);
    } else {
      this.value = '+27';
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    return this.cellphoneValidator(control);
  }

  onInputChange(value: string): void {
    const formatted = this.formatCellphone(value);
    this.value = formatted;
    this.onChange(this.value);
    this.valueChange.emit(this.value);
  }

  onKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    const input = event.target as HTMLInputElement;
    const currentValue = input.value || '';
    
    // Allow control keys: backspace, delete, tab, escape, enter, arrow keys, home, end
    const controlKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (controlKeys.includes(key)) {
      return;
    }
    
    // Allow Ctrl/Cmd + A, C, V, X, Z
    if (event.ctrlKey || event.metaKey) {
      if (['a', 'c', 'v', 'x', 'z'].includes(key.toLowerCase())) {
        return;
      }
    }
    
    // Get current digits count (excluding +27 and spaces)
    const digitsOnly = currentValue.replace(/\D/g, '');
    const digitsAfter27 = digitsOnly.startsWith('27') ? digitsOnly.substring(2) : digitsOnly;
    
    // Prevent if already have 9 digits after +27 (12 total)
    if (digitsAfter27.length >= 9) {
      event.preventDefault();
      return;
    }
    
    // Only allow digits
    if (!/^\d$/.test(key)) {
      event.preventDefault();
      return;
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const pastedText = event.clipboardData?.getData('text') || '';
    
    // Extract only digits from pasted text
    const digitsOnly = pastedText.replace(/\D/g, '');
    
    // Get current value and extract digits
    const currentValue = input.value || '';
    const currentDigitsOnly = currentValue.replace(/\D/g, '');
    const currentDigitsAfter27 = currentDigitsOnly.startsWith('27') ? currentDigitsOnly.substring(2) : currentDigitsOnly;
    
    // Calculate how many digits we can add (max 9 total after +27)
    const remainingSlots = 9 - currentDigitsAfter27.length;
    const digitsToAdd = digitsOnly.substring(0, remainingSlots);
    
    // Combine current digits with new digits
    let newDigits = '';
    if (currentDigitsOnly.startsWith('27')) {
      newDigits = '27' + currentDigitsAfter27 + digitsToAdd;
    } else {
      newDigits = '27' + (currentDigitsOnly.length > 0 ? currentDigitsOnly : '') + digitsToAdd;
    }
    
    // Format and set the value
    const formatted = this.formatCellphone('+' + newDigits);
    this.value = formatted;
    this.onChange(this.value);
    this.valueChange.emit(this.value);
  }

  onBlur(event: Event): void {
    this.onTouched();
  }

  formatCellphone(value: string): string {
    if (!value) {
      return '+27';
    }
    
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // Extract digits after +27 (skip first 2 digits if they are 27, otherwise use all digits)
    let number = '';
    if (digitsOnly.startsWith('27')) {
      // If starts with 27, take digits after it (max 9 digits)
      number = digitsOnly.substring(2, 11); // Limit to 9 digits
    } else {
      // If doesn't start with 27, use all digits (max 9)
      number = digitsOnly.substring(0, 9); // Limit to 9 digits
    }
    
    // Build formatted string: +27 XX XXX XXXX
    let formatted = '+27';
    
    if (number.length > 0) {
      formatted += ' ' + number.substring(0, 2);
    }
    if (number.length > 2) {
      formatted += ' ' + number.substring(2, 5);
    }
    if (number.length > 5) {
      formatted += ' ' + number.substring(5, 9);
    }
    
    return formatted;
  }

  cellphoneValidator(control: AbstractControl): { [key: string]: any } | null {
    const value = (control.value || '').replace(/\s/g, '');
    const validCellphonePattern = /^\+27\d{9}$/;
    if (!validCellphonePattern.test(value)) {
      return { invalidCellphone: true };
    }
    return null;
  }
}

