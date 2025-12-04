import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss'
})
export class ProgressBarComponent {
  @Input() progress: number = 0;
  @Input() showBackButton: boolean = true;
  @Input() backRoute: string = '/menus';
  @Input() backText: string = 'Back';
  @Input() allowStepNavigation: boolean = true;
  @Input() tooltipInfo?: string;
  
  @Output() stepClick = new EventEmitter<number>();
  @Output() backButtonClick = new EventEmitter<void>();
  
  steps: number = 4;

  constructor(private router: Router) {}

  onStepClick(step: number): void {
    if (this.allowStepNavigation && step < this.progress) {
      this.stepClick.emit(step);
    }
  }

  isStepClickable(step: number): boolean {
    return this.allowStepNavigation && step < this.progress;
  }

  onBackButtonClick(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (this.progress > 1) {
      // Go back one step
      const previousStep = this.progress - 1;
      this.stepClick.emit(previousStep);
    } else {
      // Check if parent component is handling the back button click
      if (this.backButtonClick.observers.length > 0) {
        // Parent component is listening, let it handle the navigation
        this.backButtonClick.emit();
      } else {
        // No parent handler, navigate directly as fallback
        this.router.navigate([this.backRoute]);
      }
    }
  }
}
