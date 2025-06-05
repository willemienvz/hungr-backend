import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/* KB: Creating a reusable SVG icon component to replace material icons with custom SVGs */
@Component({
  selector: 'app-svg-icon',
  templateUrl: './svg-icon.component.html',
  styleUrls: ['./svg-icon.component.scss']
})
export class SvgIconComponent {
  @Input() iconName: string = '';
  @Input() size: string = '16px';
  @Input() color: string = '#444444';
  @Input() class: string = 'hungrIcon';

  /* KB: Inject DomSanitizer to handle SVG content safely */
  constructor(private sanitizer: DomSanitizer) {}

  /* KB: SVG icon definitions - easily extensible for new icons */
  private readonly svgIcons: { [key: string]: string } = {
    'delete': `<svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 18C2.45 18 1.97917 17.8042 1.5875 17.4125C1.19583 17.0208 1 16.55 1 16V3H0V1H5V0H11V1H16V3H15V16C15 16.55 14.8042 17.0208 14.4125 17.4125C14.0208 17.8042 13.55 18 13 18H3ZM13 3H3V16H13V3ZM5 14H7V5H5V14ZM9 14H11V5H9V14Z" fill="currentColor"/>
    </svg>`,
    'close': `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 3.5L3.5 12.5M3.5 3.5L12.5 12.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
 
  };

  /* KB: Return sanitized SVG content that Angular can render safely */
  get svgContent(): SafeHtml {
    const svg = this.svgIcons[this.iconName] || '';
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  get iconStyles(): { [key: string]: string } {
    return {
      'width': this.size,
      'height': this.size,
      'color': this.color,
      'display': 'inline-block',
      'vertical-align': 'middle'
    };
  }
} 