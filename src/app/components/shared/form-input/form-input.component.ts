import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type InputType = 'text' | 'password' | 'email' | 'tel' | 'number' | 'url' | 'time' | 'date' | 'datetime-local';

@Component({
    selector: 'app-form-input',
    templateUrl: './form-input.component.html',
    styleUrls: ['./form-input.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => FormInputComponent),
            multi: true
        }
    ]
})
export class FormInputComponent implements ControlValueAccessor {
    @Input() type: InputType = 'text';
    @Input() placeholder: string = '';
    @Input() label: string = '';
    @Input() required: boolean = false;
    @Input() disabled: boolean = false;
    @Input() errorMessage: string = '';
    @Input() showError: boolean = false;
    @Input() prefixIcon?: string;
    @Input() suffixIcon?: string;
    @Input() min?: number;
    @Input() max?: number;
    @Input() step?: number;
    @Input() pattern?: string;
    @Input() customClass?: string;

    @Output() valueChange = new EventEmitter<string>();
    @Output() focus = new EventEmitter<Event>();
    @Output() blur = new EventEmitter<Event>();
    @Output() suffixIconClick = new EventEmitter<void>();

    value: string = '';
    isFocused: boolean = false;

    private onChange = (value: string) => { };
    private onTouched = () => { };

    writeValue(value: string): void {
        this.value = value || '';
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

    onInputChange(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.value = target.value;
        this.onChange(this.value);
        this.valueChange.emit(this.value);
    }

    onFocus(event: Event): void {
        this.isFocused = true;
        this.focus.emit(event);
    }

    onBlur(event: Event): void {
        this.isFocused = false;
        this.onTouched();
        this.blur.emit(event);
    }

    onSuffixIconClick(): void {
        if (this.suffixIcon) {
            this.suffixIconClick.emit();
        }
    }

    get inputClass(): string {
        const classes = ['form-input'];

        if (this.customClass) {
            classes.push(this.customClass);
        }

        if (this.showError && this.errorMessage) {
            classes.push('error');
        }

        if (this.isFocused) {
            classes.push('focused');
        }

        if (this.disabled) {
            classes.push('disabled');
        }

        return classes.join(' ');
    }
}
