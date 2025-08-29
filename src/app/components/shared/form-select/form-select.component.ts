import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
    value: any;
    label: string;
    disabled?: boolean;
    group?: string;
}

@Component({
    selector: 'app-form-select',
    templateUrl: './form-select.component.html',
    styleUrls: ['./form-select.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => FormSelectComponent),
            multi: true
        }
    ]
})
export class FormSelectComponent implements ControlValueAccessor {
    @Input() options: SelectOption[] = [];
    @Input() placeholder: string = 'Select an option';
    @Input() label: string = '';
    @Input() required: boolean = false;
    @Input() disabled: boolean = false;
    @Input() multiple: boolean = false;
    @Input() errorMessage: string = '';
    @Input() showError: boolean = false;
    @Input() customClass?: string;
    @Input() appearance: 'fill' | 'outline' = 'fill';

    @Output() selectionChange = new EventEmitter<any>();
    @Output() valueChange = new EventEmitter<any>();

    value: any = null;
    isFocused: boolean = false;

    private onChange = (value: any) => { };
    private onTouched = () => { };

    writeValue(value: any): void {
        this.value = value;
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

    onSelectionChange(event: any): void {
        this.value = event.value;
        this.onChange(this.value);
        this.selectionChange.emit(event);
        this.valueChange.emit(this.value);
    }

    onFocus(): void {
        this.isFocused = true;
    }

    onBlur(): void {
        this.isFocused = false;
        this.onTouched();
    }

    get groupedOptions(): { [key: string]: SelectOption[] } {
        const groups: { [key: string]: SelectOption[] } = {};
        const ungrouped: SelectOption[] = [];

        this.options.forEach(option => {
            if (option.group) {
                if (!groups[option.group]) {
                    groups[option.group] = [];
                }
                groups[option.group].push(option);
            } else {
                ungrouped.push(option);
            }
        });

        if (ungrouped.length > 0) {
            groups[''] = ungrouped;
        }

        return groups;
    }

    get hasGroups(): boolean {
        return Object.keys(this.groupedOptions).some(key => key !== '');
    }

    get selectClass(): string {
        const classes = ['form-select'];

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
