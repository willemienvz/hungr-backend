import { Component } from '@angular/core';

@Component({
  selector: 'app-general',
  templateUrl: './general.component.html',
  styleUrl: './general.component.scss'
})
export class GeneralComponent {
  isTooltipOpen:boolean = false;

  emailNotificationsEnabled: boolean = false;
  tipsAndTutorialsEnabled: boolean = false;
  userInsightsEnabled: boolean = false;
  
  opentooltip(){
    this.isTooltipOpen != this.isTooltipOpen;
  }
}
