import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrl: './tooltip.component.scss'
})
export class TooltipComponent {
  @Input() text: string = '';
  @Input() showToTheLeft: boolean = false;
  @Input() isVisible: boolean = false;

}
