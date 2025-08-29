import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stats-table-block',
  templateUrl: './stats-table-block.component.html',
  styleUrl: './stats-table-block.component.scss'
})
export class StatsTableBlockComponent {
  @Input() heading: string = '';
  @Input() tooltiptext: string = '';
  @Input() timeText: string = '';
  @Input() data: any = [];

  isTooltipOpen:boolean = false;


  opentooltip(){
    this.isTooltipOpen != this.isTooltipOpen;
  }
}
