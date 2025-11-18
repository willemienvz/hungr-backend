import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
    selector: 'app-form-radio',
    templateUrl: './form-radio.component.html',
    styleUrls: ['./form-radio.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => FormRadioComponent),
            multi: true
        }
    ]
})
export class FormRadioComponent implements ControlValueAccessor {
    @Input() label: string = '';
    @Input() name: string = '';
    @Input() value: any;
    @Input() required: boolean = false;
    @Input() disabled: boolean = false;
    @Input() errorMessage: string = '';
    @Input() showError: boolean = false;
    @Input() customClass?: string;
    @Input() id: string = '';

    @Output() valueChange = new EventEmitter<any>();
    @Output() focus = new EventEmitter<Event>();
    @Output() blur = new EventEmitter<Event>();

    selectedValue: any;
    isFocused: boolean = false;

    private onChange = (value: any) => { };
    private onTouched = () => { };

    writeValue(value: any): void {
        this.selectedValue = value;
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
        if (target.checked) {
            this.selectedValue = this.value;
            this.onChange(this.selectedValue);
            this.valueChange.emit(this.selectedValue);
        }
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

    get isChecked(): boolean {
        return this.selectedValue === this.value;
    }

    get radioClass(): string {
        const classes = ['form-radio'];

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

    get radioId(): string {
        return this.id || `radio-${Math.random().toString(36).substring(2, 11)}`;
    }

    get radioName(): string {
        return this.name || `radio-group-${Math.random().toString(36).substring(2, 11)}`;
    }
}