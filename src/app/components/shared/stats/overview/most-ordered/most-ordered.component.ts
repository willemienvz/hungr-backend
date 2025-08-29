import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-most-ordered',
  templateUrl: './most-ordered.component.html',
  styleUrl: './most-ordered.component.scss'
})
export class MostOrderedComponent {
  @Input() heading: string = '';
  @Input() tooltiptext: string = '';
  @Input() timeText: string = '';
  @Input() data: any = [];

  isTooltipOpen:boolean = false;


  opentooltip(){
    this.isTooltipOpen != this.isTooltipOpen;
  }
}
