import { Component, Input, Output, EventEmitter } from '@angular/core';

export type ActionButtonType = 'view' | 'edit' | 'delete' | 'add' | 'toggle' | 'download' | 'upload' | 'duplicate' | 'custom';
export type ActionButtonSize = 'small' | 'medium';

@Component({
    selector: 'app-action-button',
    templateUrl: './action-button.component.html',
    styleUrls: ['./action-button.component.scss']
})
export class ActionButtonComponent {
    @Input() type: ActionButtonType = 'view';
    @Input() size: ActionButtonSize = 'medium';
    @Input() disabled: boolean = false;
    @Input() loading: boolean = false;
    @Input() title?: string;
    @Input() routerLink?: string | any[];
    @Input() queryParams?: any;
    @Input() customIcon?: string;
    @Input() customColor?: string;
    @Input() stopPropagation: boolean = true;

    @Output() actionClick = new EventEmitter<Event>();

    get buttonClass(): string {
        const classes = ['action-button'];

        if (this.size !== 'medium') {
            classes.push(`action-button-${this.size}`);
        }

        if (this.type !== 'custom') {
            classes.push(`action-button-${this.type}`);
        }

        if (this.disabled || this.loading) {
            classes.push('action-button-disabled');
        }

        return classes.join(' ');
    }

    get iconName(): string {
        if (this.customIcon) {
            return this.customIcon;
        }

        const iconMap: Record<ActionButtonType, string> = {
            view: 'visibility',
            edit: 'edit',
            delete: 'delete',
            add: 'add',
            toggle: 'power_settings_new',
            download: 'download',
            upload: 'upload',
            duplicate: 'content_copy',
            custom: 'help_outline'
        };

        return iconMap[this.type];
    }

    get buttonStyle(): Record<string, string> {
        const style: Record<string, string> = {};

        if (this.customColor) {
            style['color'] = this.customColor;
        }

        return style;
    }

    onClick(event: Event): void {
        if (this.stopPropagation) {
            event.stopPropagation();
            event.preventDefault();
        }

        if (!this.disabled && !this.loading && !this.routerLink) {
            this.actionClick.emit(event);
        }
    }
}
