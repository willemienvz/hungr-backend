import { Component, Input, Output, EventEmitter, forwardRef, OnChanges, SimpleChanges, OnInit } from '@angular/core';
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
export class FormSelectComponent implements ControlValueAccessor, OnChanges, OnInit {
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

    // Memoized properties to prevent infinite change detection loops
    groupedOptions: { [key: string]: SelectOption[] } = {};
    hasGroups: boolean = false;
    private lastOptionsLength: number = 0;
    private lastOptionsHash: string = '';

    private onChange = (value: any) => { };
    private onTouched = () => { };

    ngOnInit(): void {
        // Initialize grouped options on component init
        this.updateGroupedOptions();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['options']) {
            this.updateGroupedOptions();
        }
    }

    private updateGroupedOptions(): void {
        // Create a hash to detect actual changes in options
        const optionsHash = JSON.stringify(this.options);
        
        // Only update if options actually changed
        if (optionsHash === this.lastOptionsHash && this.options.length === this.lastOptionsLength) {
            return;
        }

        this.lastOptionsHash = optionsHash;
        this.lastOptionsLength = this.options.length;

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

        this.groupedOptions = groups;
        this.hasGroups = Object.keys(this.groupedOptions).some(key => key !== '');
    }

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
