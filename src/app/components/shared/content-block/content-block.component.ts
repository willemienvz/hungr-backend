import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-content-block',
  templateUrl: './content-block.component.html',
  styleUrls: ['./content-block.component.scss']
})
export class ContentBlockComponent {
  @Input() title: string = '';
  @Input() showHeader: boolean = true;
  @Input() showActions: boolean = false;
  @Input() actions: any[] = [];
  @Input() filterOptions: any[] = [];
  @Input() selectedFilter: string = '';
  @Input() showFilter: boolean = false;
  @Input() customClass: string = '';
  
  @Output() filterChange = new EventEmitter<string>();
  @Output() actionClick = new EventEmitter<any>();

  onFilterChange(value: string) {
    this.filterChange.emit(value);
  }

  onActionClick(action: any) {
    this.actionClick.emit(action);
  }
} 