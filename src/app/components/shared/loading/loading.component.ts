import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.scss'
})
export class LoadingComponent implements OnChanges {
  @Input() isLoading: boolean = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isLoading']) {
      const newValue = changes['isLoading'].currentValue;
      const previousValue = changes['isLoading'].previousValue;
      console.log(`🔄 Loading Component: State changed from ${previousValue} to ${newValue}`);

      if (newValue === false) {
        console.log('✅ Loading Component: Loading completed, spinner should disappear');
      } else if (newValue === true) {
        console.log('⏳ Loading Component: Loading started, spinner should appear');
      }
    }
  }
}
