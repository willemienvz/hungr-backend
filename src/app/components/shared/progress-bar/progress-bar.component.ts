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

  onBackButtonClick(): void {
    if (this.progress > 1) {
      // Go back one step
      this.stepClick.emit(this.progress - 1);
    } else {
      console.log('onBackButtonClick', this.progress);
      
      // Check if parent component is handling the back button click
      if (this.backButtonClick.observers.length > 0) {
        // Parent component is listening, let it handle the navigation
        console.log('Parent component handling back button, emitting event');
        this.backButtonClick.emit();
      } else {
        // No parent handler, navigate directly as fallback
        console.log('No parent handler, navigating directly');
        this.router.navigate([this.backRoute]);
      }
    }
  }
}
