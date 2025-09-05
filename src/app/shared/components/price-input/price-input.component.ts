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

  // Get numeric value for the number input (without "R " prefix)
  get numericValue(): string {
    if (!this._value) return '';
    const numericStr = this._value.replace(/[^0-9.]/g, '');
    return numericStr;
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    if (value !== undefined && value !== null) {
      this._value = value;
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
    
    // Store the numeric value without formatting during typing
    this.value = inputValue;
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