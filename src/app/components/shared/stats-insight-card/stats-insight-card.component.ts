import { Component, Input } from '@angular/core';

export type StatsCardType = 'numeric' | 'colored-block' | 'text-block';
export type StatsCardVariant = 'primary' | 'secondary' | 'default';

@Component({
    selector: 'app-stats-insight-card',
    templateUrl: './stats-insight-card.component.html',
    styleUrls: ['./stats-insight-card.component.scss']
})
export class StatsInsightCardComponent {
    @Input() title: string = '';
    @Input() subtitle?: string = '';
    @Input() value: string | number = '';
    @Input() trend?: string = '';
    @Input() trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
    @Input() type: StatsCardType = 'numeric';
    @Input() variant: StatsCardVariant = 'default';
    @Input() tooltipText: string = '';

    isTooltipOpen: boolean = false;

    get cardClass(): string {
        const classes = ['stats-insight-card', `type-${this.type}`];

        if (this.type === 'colored-block' || this.type === 'text-block') {
            classes.push(`variant-${this.variant}`);
        }

        return classes.join(' ');
    }

    get trendColor(): string {
        if (this.trendDirection === 'up') {
            return '#16D3D2';
        } else if (this.trendDirection === 'down') {
            return '#FE1B54';
        }
        return '#9A9A9A';
    }

    get blockColor(): string {
        switch (this.variant) {
            case 'primary':
                return '#16D3D2';
            case 'secondary':
                return '#444444';
            default:
                return '#16D3D2';
        }
    }

    openTooltip(): void {
        this.isTooltipOpen = true;
    }

    closeTooltip(): void {
        this.isTooltipOpen = false;
    }
}
