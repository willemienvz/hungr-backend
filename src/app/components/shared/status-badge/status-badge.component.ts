import { Component, Input } from '@angular/core';

export type StatusType = 'active' | 'inactive' | 'pending' | 'expired' | 'draft' | 'published' | 'completed' | 'error' | 'warning' | 'success' | 'info';
export type BadgeSize = 'small' | 'medium' | 'large';

@Component({
    selector: 'app-status-badge',
    templateUrl: './status-badge.component.html',
    styleUrls: ['./status-badge.component.scss']
})
export class StatusBadgeComponent {
    @Input() status: StatusType = 'active';
    @Input() showIcon: boolean = true;
    @Input() size: BadgeSize = 'medium';
    @Input() customText?: string;
    @Input() customClass?: string;

    get statusConfig() {
        const configs = {
            active: { icon: 'check_circle', color: 'success', defaultText: 'Active' },
            inactive: { icon: 'cancel', color: 'grey', defaultText: 'Inactive' },
            pending: { icon: 'schedule', color: 'warning', defaultText: 'Pending' },
            expired: { icon: 'error', color: 'error', defaultText: 'Expired' },
            draft: { icon: 'edit', color: 'grey', defaultText: 'Draft' },
            published: { icon: 'published_with_changes', color: 'success', defaultText: 'Published' },
            completed: { icon: 'check_circle', color: 'success', defaultText: 'Completed' },
            error: { icon: 'error', color: 'error', defaultText: 'Error' },
            warning: { icon: 'warning', color: 'warning', defaultText: 'Warning' },
            success: { icon: 'check_circle', color: 'success', defaultText: 'Success' },
            info: { icon: 'info', color: 'info', defaultText: 'Info' }
        };

        return configs[this.status] || configs.active;
    }

    get badgeClass(): string {
        const classes = [
            'status-badge',
            `status-${this.status}`,
            `status-${this.statusConfig.color}`,
            `size-${this.size}`
        ];

        if (this.customClass) {
            classes.push(this.customClass);
        }

        return classes.join(' ');
    }

    get displayText(): string {
        return this.customText || this.statusConfig.defaultText;
    }
}
