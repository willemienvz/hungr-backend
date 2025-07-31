import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-special-summary',
  templateUrl: './special-summary.component.html',
  styleUrls: ['./special-summary.component.scss']
})
export class SpecialSummaryComponent implements OnChanges {
  @Input() specialTitle: string = '';
  @Input() specialType: number | null = null;
  @Input() dateFrom: string = '';
  @Input() dateTo: string = '';
  @Input() timeFrom: string = '';
  @Input() timeTo: string = '';
  @Input() selectedDays: string[] = [];
  @Input() currentStep: number = 1;
  @Input() specialTypes: Array<{id: number, name: string}> = [];

  summaryVisible = false;
  summaryLines: string[] = [];

  ngOnChanges(changes: SimpleChanges) {
    this.updateSummary();
  }

  private updateSummary() {
    // Only show summary on steps 2-4
    if (this.currentStep < 2 || this.currentStep > 4) {
      this.summaryVisible = false;
      return;
    }

    const lines: string[] = [];
    
    // Special Name
    if (this.specialTitle) {
      lines.push(this.specialTitle);
    }
    
    // Special Type
    if (this.specialType) {
      lines.push(this.getSpecialTypeLabel(this.specialType));
    }
    
    // Date Range - only show if both dates are filled and not default
    if (this.dateFrom && this.dateTo && this.dateFrom !== '' && this.dateTo !== '') {
      lines.push(`Valid from ${this.formatDate(this.dateFrom)} - ${this.formatDate(this.dateTo)}`);
    }
    
    // Days - only show if days are actually selected
    if (this.selectedDays && this.selectedDays.length > 0) {
      lines.push(this.formatDays(this.selectedDays));
    }
    
    // Time - only show if times are filled and not default
    if (this.timeFrom && this.timeTo && this.timeFrom !== '00:00' && this.timeTo !== '00:00') {
      lines.push(`${this.formatTime(this.timeFrom)} - ${this.formatTime(this.timeTo)}`);
    }
    
    this.summaryLines = lines;
    this.summaryVisible = lines.length > 0 && !!this.specialTitle;
  }

  private getSpecialTypeLabel(type: number): string {
    const typeObj = this.specialTypes.find(t => t.id === type);
    return typeObj ? typeObj.name : 'Unknown Type';
  }

  private formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
  }

  private formatTime(time: string): string {
    if (!time) return '';
    // Assume time is in HH:mm format
    return time.slice(0, 5);
  }

  private formatDays(days: string[]): string {
    if (days.length === 1) {
      return `Every ${days[0]}`;
    } else if (days.length > 1) {
      return days.join(', ');
    }
    return '';
  }
} 