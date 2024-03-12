import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stats-overview-block',
  templateUrl: './stats-overview-block.component.html',
  styleUrl: './stats-overview-block.component.scss'
})
export class StatsOverviewBlockComponent {
  @Input() heading: string = '';
  @Input() tooltiptext: string = '';
  @Input() timeText: string = '';
  @Input() stat: string = '';
  @Input() movement: string = '';

  isTooltipOpen:boolean = false;


  opentooltip(){
    this.isTooltipOpen != this.isTooltipOpen;
  }
}
