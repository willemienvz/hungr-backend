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

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    if (value !== undefined && value !== null) {
      this._value = this.formatPrice(value);
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

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const inputValue = target.value;
    
    // Format the price and update the input
    const formattedValue = this.formatPrice(inputValue);
    target.value = formattedValue;
    this.value = formattedValue;
  }

  onBlur(): void {
    this.onTouched();
  }

  onKeypress(event: KeyboardEvent): boolean {
    // Allow: backspace, delete, tab, escape, enter, home, end, left, right arrows
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End', 'ArrowLeft', 'ArrowRight'];
    
    // Allow decimal point (only one)
    if (event.key === '.' && !(event.target as HTMLInputElement).value.includes('.')) {
      return true;
    }
    
    // Allow allowed keys
    if (allowedKeys.includes(event.key)) {
      return true;
    }
    
    // Allow numbers 0-9
    if (event.key >= '0' && event.key <= '9') {
      return true;
    }
    
    // Block everything else
    event.preventDefault();
    return false;
  }

  private formatPrice(inputValue: string): string {
    if (!inputValue) return 'R 0.00';
    
    // Remove all non-numeric characters except decimal point
    let numericValue = inputValue.replace(/[^0-9.]/g, '');
    
    // Handle empty input
    if (!numericValue) return 'R 0.00';
    
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      numericValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Convert to number and format to 2 decimal places
    const num = parseFloat(numericValue) || 0;
    const formatted = num.toFixed(2);
    
    return `R ${formatted}`;
  }

  // Method to get the numeric value without currency formatting
  getNumericValue(): number {
    const numericStr = this._value.replace(/[^0-9.]/g, '');
    return parseFloat(numericStr) || 0;
  }

  // Method to set value programmatically
  setValue(value: number | string): void {
    if (typeof value === 'number') {
      this.value = this.formatPrice(value.toString());
    } else {
      this.value = this.formatPrice(value);
    }
  }
} 