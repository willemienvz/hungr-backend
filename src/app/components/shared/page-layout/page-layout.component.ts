import { Component, Input } from '@angular/core';

export interface PageAction {
    label: string;
    icon?: string;
    type?: 'primary' | 'secondary' | 'tertiary' | 'danger';
    routerLink?: string;
    queryParams?: any;
    disabled?: boolean;
    onClick?: () => void;
}

@Component({
    selector: 'app-page-layout',
    templateUrl: './page-layout.component.html',
    styleUrls: ['./page-layout.component.scss']
})
export class PageLayoutComponent {
    @Input() title: string = '';
    @Input() subtitle?: string;
    @Input() actions: PageAction[] = [];
    @Input() showBackButton: boolean = false;
    @Input() backButtonText: string = 'Back';
    @Input() backRoute?: string;
    @Input() loading: boolean = false;
    @Input() customClass?: string;

    get pageClass(): string {
        const classes = ['page-layout'];

        if (this.customClass) {
            classes.push(this.customClass);
        }

        return classes.join(' ');
    }

    onActionClick(action: PageAction): void {
        if (action.onClick && !action.disabled) {
            action.onClick();
        }
    }
}
