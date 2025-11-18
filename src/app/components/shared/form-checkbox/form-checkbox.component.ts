import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
    selector: 'app-form-checkbox',
    templateUrl: './form-checkbox.component.html',
    styleUrls: ['./form-checkbox.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => FormCheckboxComponent),
            multi: true
        }
    ]
})
export class FormCheckboxComponent implements ControlValueAccessor {
    @Input() label: string = '';
    @Input() required: boolean = false;
    @Input() disabled: boolean = false;
    @Input() errorMessage: string = '';
    @Input() showError: boolean = false;
    @Input() customClass?: string;
    @Input() id: string = '';
    @Input() name: string = '';

    @Output() valueChange = new EventEmitter<boolean>();
    @Output() focus = new EventEmitter<Event>();
    @Output() blur = new EventEmitter<Event>();

    value: boolean = false;
    isFocused: boolean = false;

    private onChange = (value: boolean) => { };
    private onTouched = () => { };

    writeValue(value: boolean): void {
        this.value = value || false;
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
        this.value = target.checked;
        this.onChange(this.value);
        this.valueChange.emit(this.value);
        this.onTouched();
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

    onContainerClick(event: Event): void {
        // Prevent toggling if disabled or if the click was on the input itself (to avoid double triggering)
        if (this.disabled || event.target === this.getCheckboxInput()) {
            return;
        }

        // Toggle the checkbox value
        this.value = !this.value;
        this.onChange(this.value);
        this.valueChange.emit(this.value);
        this.onTouched();
    }

    private getCheckboxInput(): HTMLInputElement | null {
        return document.getElementById(this.checkboxId) as HTMLInputElement;
    }

    get checkboxClass(): string {
        const classes = ['form-checkbox'];

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

    get checkboxId(): string {
        return this.id || `checkbox-${Math.random().toString(36).substring(2, 11)}`;
    }
}