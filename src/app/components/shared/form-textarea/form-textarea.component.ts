import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
    selector: 'app-form-textarea',
    templateUrl: './form-textarea.component.html',
    styleUrls: ['./form-textarea.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => FormTextareaComponent),
            multi: true
        }
    ]
})
export class FormTextareaComponent implements ControlValueAccessor {
    @Input() placeholder: string = '';
    @Input() label: string = '';
    @Input() required: boolean = false;
    @Input() disabled: boolean = false;
    @Input() errorMessage: string = '';
    @Input() showError: boolean = false;
    @Input() rows: number = 3;
    @Input() maxLength?: number;
    @Input() minLength?: number;
    @Input() customClass?: string;

    @Output() valueChange = new EventEmitter<string>();
    @Output() focus = new EventEmitter<Event>();
    @Output() blur = new EventEmitter<Event>();

    value: string = '';
    isFocused: boolean = false;
    characterCount: number = 0;

    private onChange = (value: string) => { };
    private onTouched = () => { };

    writeValue(value: string): void {
        this.value = value || '';
        this.characterCount = this.value.length;
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
        const target = event.target as HTMLTextAreaElement;
        this.value = target.value;
        this.characterCount = this.value.length;
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

    get textareaClass(): string {
        const classes = ['form-textarea'];

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

    get showCharacterCount(): boolean {
        return this.maxLength !== undefined;
    }

    get characterCountText(): string {
        return `${this.characterCount}/${this.maxLength}`;
    }

    get isOverLimit(): boolean {
        return this.maxLength !== undefined && this.characterCount > this.maxLength;
    }
}
