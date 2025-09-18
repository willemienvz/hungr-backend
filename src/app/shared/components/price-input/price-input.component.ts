import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';

@Component({
  selector: 'app-price-input',
  templateUrl: './price-input.component.html',
  styleUrls: ['./price-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PriceInputComponent),
      multi: true
    }
  ]
})
export class PriceInputComponent implements ControlValueAccessor {
  @Input() label: string = 'Price';
  @Input() placeholder: string = 'R 0.00';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() errorMessage: string = '';
  @Input() showError: boolean = false;

  @Output() valueChange = new EventEmitter<string>();

  private _value: string = '';
  private onChange = (value: string) => {};
  private onTouched = () => {};

  get value(): string {
    return this._value;
  }

  set value(val: string) {
    this._value = val;
    this.onChange(val);
    this.valueChange.emit(val);
  }

  // Get display value for the input (without "R " prefix when editing)
  get displayValue(): string | null {
    if (!this._value || this._value.trim() === '') return null;
    // Remove "R " prefix for display in input
    const cleanValue = this._value.replace(/^R\s*/, '');
    return cleanValue;
  }

  // Set display value from input
  set displayValue(val: string | null) {
    // Only allow numbers and decimal point
    if (val === '' || val === null) {
      this.value = '';
      return;
    }
    
    // Validate and clean the input
    const cleanedValue = this.validateNumericInput(val);
    this.value = cleanedValue;
  }

  private validateNumericInput(input: string): string {
    if (!input) return '';
    
    // Only allow numbers and decimal point
    let cleaned = input.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    return cleaned;
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    if (value !== undefined && value !== null) {
      this._value = value;
    } else {
      this._value = '';
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onKeyDown(event: KeyboardEvent): void {
    // Allow backspace, delete, tab, escape, enter, home, end, left, right arrows
    if ([8, 9, 27, 13, 46, 35, 36, 37, 39].indexOf(event.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (event.keyCode === 65 && event.ctrlKey === true) ||
        (event.keyCode === 67 && event.ctrlKey === true) ||
        (event.keyCode === 86 && event.ctrlKey === true) ||
        (event.keyCode === 88 && event.ctrlKey === true)) {
      return;
    }
    
    // Ensure that it is a number or decimal point and stop the keypress
    if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) && 
        (event.keyCode < 96 || event.keyCode > 105) && 
        event.keyCode !== 190 && event.keyCode !== 110) {
      event.preventDefault();
    }
    
    // Prevent multiple decimal points
    const target = event.target as HTMLInputElement;
    if ((event.keyCode === 190 || event.keyCode === 110) && target.value.indexOf('.') !== -1) {
      event.preventDefault();
    }
  }

  onBlur(): void {
    // Format with currency prefix only on blur
    if (this.value && !this.value.startsWith('R ')) {
      this.value = `R ${this.value}`;
    }
    this.onTouched();
  }


  // Method to get the numeric value without currency formatting
  getNumericValue(): number {
    const numericStr = this._value.replace(/[^0-9.]/g, '');
    return parseFloat(numericStr) || 0;
  }

  // Method to set value programmatically
  setValue(value: number | string): void {
    if (typeof value === 'number') {
      this.value = value.toString();
    } else {
      this.value = value;
    }
  }
} 