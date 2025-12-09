import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface TableColumn {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    type?: 'text' | 'status' | 'action' | 'custom';
    customTemplate?: string;
    format?: (value: any, row?: any) => string;
}

export interface TableAction {
    key: string;
    label: string;
    icon: string;
    color?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
    disabled?: (row: any) => boolean;
    visible?: (row: any) => boolean;
}

export interface TableRow {
    [key: string]: any;
    id?: string | number;
}

export interface TableActionEvent<T = any> {
    action: TableAction;
    row: T;
    index: number;
}

@Component({
    selector: 'app-data-table',
    templateUrl: './data-table.component.html',
    styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent {
    @Input() columns: TableColumn[] = [];
    @Input() data: TableRow[] = [];
    @Input() actions: TableAction[] = [];
    @Input() loading: boolean = false;
    @Input() emptyMessage: string = 'No data available';
    @Input() showIndex: boolean = false;
    @Input() indexLabel: string = '#';
    @Input() indexWidth: string = '60px';
    @Input() sortable: boolean = true;
    @Input() striped: boolean = false;
    @Input() hover: boolean = true;
    @Input() bordered: boolean = false;

    @Output() actionClick = new EventEmitter<TableActionEvent>();
    @Output() rowClick = new EventEmitter<{ row: TableRow; index: number }>();
    @Output() sortChange = new EventEmitter<{ column: TableColumn; direction: 'asc' | 'desc' }>();

    sortColumn: string = '';
    sortDirection: 'asc' | 'desc' = 'asc';

    get sortedData(): TableRow[] {
        if (!this.sortColumn || !this.sortable) {
            return this.data;
        }

        return [...this.data].sort((a, b) => {
            const aValue = this.getValue(a, this.sortColumn);
            const bValue = this.getValue(b, this.sortColumn);

            let result = 0;
            if (aValue < bValue) result = -1;
            if (aValue > bValue) result = 1;

            return this.sortDirection === 'asc' ? result : -result;
        });
    }

    get visibleColumns(): TableColumn[] {
        return this.columns.filter(col => col.type !== 'action');
    }

    get hasActions(): boolean {
        return this.actions.length > 0;
    }

    getActionColorClass(action: TableAction): string {
        return action.color ? `action-${action.color}` : '';
    }

    getActionButtonType(action: TableAction): 'view' | 'edit' | 'delete' | 'add' | 'toggle' | 'download' | 'upload' | 'duplicate' | 'custom' {
        // Map action keys to button types
        const actionTypeMap: Record<string, 'view' | 'edit' | 'delete' | 'add' | 'toggle' | 'download' | 'upload' | 'duplicate' | 'custom'> = {
            'view': 'view',
            'edit': 'edit',
            'delete': 'delete',
            'add': 'add',
            'create': 'add', // Map 'create' to 'add' type
            'toggle': 'toggle',
            'download': 'download',
            'upload': 'upload',
            'duplicate': 'duplicate'
        };

        return actionTypeMap[action.key] || 'custom';
    }

    getActionButtonColor(action: TableAction): string | undefined {
        // Map action colors to CSS color values
        const colorMap: Record<string, string> = {
            'primary': 'var(--color-secondary)',
            'secondary': 'var(--color-grey-600)',
            'danger': '#d32f2f',
            'success': '#388e3c',
            'warning': '#f57c00'
        };

        return action.color ? colorMap[action.color] : undefined;
    }

    getColumnWidth(column: TableColumn): string {
        return column.width || 'auto';
    }

    getColumnAlignClass(column: TableColumn): string {
        return column.align ? `text-${column.align}` : '';
    }

    getValue(row: TableRow, key: string): any {
        return key.split('.').reduce((obj, k) => obj?.[k], row);
    }

    formatValue(column: TableColumn, row: TableRow): string {
        const value = this.getValue(row, column.key);
        return column.format ? column.format(value, row) : value;
    }

    onSort(column: TableColumn): void {
        if (!column.sortable && this.sortable) return;

        if (this.sortColumn === column.key) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column.key;
            this.sortDirection = 'asc';
        }

        this.sortChange.emit({ column, direction: this.sortDirection });
    }

    onActionClick(action: TableAction, row: TableRow, index: number, event?: Event): void {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.actionClick.emit({ action, row, index } as TableActionEvent);
    }

    onRowClick(row: TableRow, index: number, event?: Event): void {
        if (event) {
            // Don't trigger row click if clicking on action buttons or their container
            const target = event.target as HTMLElement;
            // Check for action button component, action button class, or actions cell
            if (target.closest('app-action-button') || 
                target.closest('.actions-cell') || 
                target.closest('.action-button') ||
                target.closest('.action-buttons')) {
                return;
            }
            // Stop propagation to prevent any parent handlers
            event.stopPropagation();
        }
        this.rowClick.emit({ row, index });
    }

    isActionDisabled(action: TableAction, row: TableRow): boolean {
        return action.disabled ? action.disabled(row) : false;
    }

    isActionVisible(action: TableAction, row: TableRow): boolean {
        return action.visible ? action.visible(row) : true;
    }

    trackByFn(index: number, item: TableRow): any {
        return item.id || index;
    }
}
