import { Component, Input } from '@angular/core';

export type StatsCardSize = 'small' | 'medium' | 'large';
export type TrendDirection = 'up' | 'down' | 'neutral';

@Component({
    selector: 'app-stats-card',
    templateUrl: './stats-card.component.html',
    styleUrls: ['./stats-card.component.scss']
})
export class StatsCardComponent {
    @Input() title: string = '';
    @Input() value: string | number = '';
    @Input() subtitle?: string;
    @Input() trend?: string;
    @Input() trendDirection: TrendDirection = 'neutral';
    @Input() icon?: string;
    @Input() size: StatsCardSize = 'medium';
    @Input() clickable: boolean = false;
    @Input() customClass?: string;

    get cardClass(): string {
        const classes = ['stats-card', `size-${this.size}`];

        if (this.customClass) {
            classes.push(this.customClass);
        }

        if (this.clickable) {
            classes.push('clickable');
        }

        return classes.join(' ');
    }

    get trendIcon(): string {
        switch (this.trendDirection) {
            case 'up':
                return 'trending_up';
            case 'down':
                return 'trending_down';
            default:
                return 'trending_flat';
        }
    }

    get trendClass(): string {
        return `trend-${this.trendDirection}`;
    }

    formatValue(value: string | number): string {
        if (typeof value === 'number') {
            if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
            }
            return value.toString();
        }
        return value;
    }
}
