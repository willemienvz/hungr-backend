import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-additional-insights',
  templateUrl: './additional-insights.component.html',
  styleUrl: './additional-insights.component.scss'
})
export class AdditionalInsightsComponent {
  @Input() heading: string = '';
  @Input() tooltiptext: string = '';
  @Input() timeText: string = '';
  @Input() data: any = [];

  isTooltipOpen:boolean = false;


  opentooltip(){
    this.isTooltipOpen != this.isTooltipOpen;
  }
}
