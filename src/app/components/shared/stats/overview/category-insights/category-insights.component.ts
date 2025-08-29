import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-category-insights',
  templateUrl: './category-insights.component.html',
  styleUrl: './category-insights.component.scss'
})
export class CategoryInsightsComponent {
  @Input() heading: string = '';
  @Input() tooltiptext: string = '';
  @Input() timeText: string = '';
  @Input() data: any = [];

  isTooltipOpen:boolean = false;


  opentooltip(){
    this.isTooltipOpen != this.isTooltipOpen;
  }
}
