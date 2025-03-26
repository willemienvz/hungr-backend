import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stats-overview-block',
  templateUrl: './stats-overview-block.component.html',
  styleUrl: './stats-overview-block.component.scss',
})
export class StatsOverviewBlockComponent {
  @Input() heading: string = '';
  @Input() tooltiptext: string = '';
  @Input() timeText: string = '';
  @Input() stat: string = '';
  @Input() movement: string = '';
  @Input() showLeft: boolean = false;
  @Input() textSize: string = 'M';

  isTooltipOpen: boolean = false;

  getMovementColor(): string {
    const movementValue = parseFloat(this.movement.replace('%', ''));
    return movementValue < 0 ? '#FE1B54' : '#16D3D2';
  }

  opentooltip() {
    this.isTooltipOpen != this.isTooltipOpen;
  }
}
