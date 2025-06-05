import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-step-header',
  templateUrl: './step-header.component.html',
  styleUrl: './step-header.component.scss'
})
export class StepHeaderComponent {
  /* KB - Component to encapsulate step headers with step number, title, and optional description */
  @Input() stepNumber: number = 1;
  @Input() stepTitle: string = '';
  @Input() description?: string;
  @Input() showDescription: boolean = false;
} 