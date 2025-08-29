import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';

export type ButtonType = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'gray' | 'blue';
export type ButtonSize = 'small' | 'medium' | 'large';

@Component({
    selector: 'app-button',
    templateUrl: './button.component.html',
    styleUrls: ['./button.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ButtonComponent {
    @Input() type: ButtonType = 'secondary';
    @Input() size: ButtonSize = 'medium';
    @Input() disabled: boolean = false;
    @Input() loading: boolean = false;
    @Input() icon?: string;
    @Input() iconPosition: 'left' | 'right' = 'left';
    @Input() routerLink?: string;
    @Input() queryParams?: any;
    @Input() minWidth?: string;
    @Input() customClass?: string;
    @Input() label?: string;

    @Output() buttonClick = new EventEmitter<Event>();

    get buttonClass(): string {
        const classes = [`btn${this.type.charAt(0).toUpperCase() + this.type.slice(1)}`];

        if (this.size !== 'medium') {
            classes.push(`btn-${this.size}`);
        }

        if (this.disabled || this.loading) {
            classes.push('disabled');
        }

        if (this.customClass) {
            classes.push(this.customClass);
        }

        return classes.join(' ');
    }

    get buttonType(): string {
        return 'button';
    }

    onClick(event: Event): void {
        if (!this.disabled && !this.loading) {
            this.buttonClick.emit(event);
        }
    }
}
