# Content Block Component

A reusable content block component that provides consistent styling across the application, matching the design pattern used in the specials landing page.

## Usage

### Basic Usage
```html
<app-content-block title="Section Title">
  <!-- Your content here -->
  <div>Content goes inside the block</div>
</app-content-block>
```

### With Actions
```html
<app-content-block 
  title="Add New Item"
  [showActions]="true"
  [actions]="[
    { label: '+ ADD NEW', routerLink: '/path/to/add', class: 'btnSecondary' }
  ]">
</app-content-block>
```

### With Filter
```html
<app-content-block 
  title="Filtered Items"
  [showFilter]="true"
  [filterOptions]="[
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]"
  (filterChange)="onFilterChange($event)">
  <!-- Content -->
</app-content-block>
```

### With Both Actions and Filter
```html
<app-content-block 
  title="Items"
  [showActions]="true"
  [showFilter]="true"
  [actions]="[{ label: 'Add New', routerLink: '/add', class: 'btnSecondary' }]"
  [filterOptions]="[{ value: 'all', label: 'All' }]"
  (filterChange)="onFilterChange($event)"
  (actionClick)="onActionClick($event)">
  <!-- Content -->
</app-content-block>
```

## Input Properties

- `title: string` - The section title (default: '')
- `showHeader: boolean` - Whether to show the header section (default: true)
- `showActions: boolean` - Whether to show action buttons (default: false)
- `actions: any[]` - Array of action objects with label, routerLink, and class properties
- `showFilter: boolean` - Whether to show the filter dropdown (default: false)
- `filterOptions: any[]` - Array of filter options with value and label properties
- `selectedFilter: string` - Currently selected filter value
- `customClass: string` - Additional CSS classes to apply

## Output Events

- `filterChange: EventEmitter<string>` - Emitted when filter selection changes
- `actionClick: EventEmitter<any>` - Emitted when an action button is clicked

## Action Object Structure
```typescript
{
  label: string;        // Button text
  routerLink?: string;  // Router link (optional)
  class?: string;       // CSS class (optional)
}
```

## Filter Option Structure
```typescript
{
  value: string;  // Filter value
  label: string;  // Display label
}
```

## Styling

The component uses the same styling pattern as the specials landing blocks:
- Consistent typography with Poppins font
- Proper spacing and alignment
- Hover effects on interactive elements
- Responsive design

## Migration from Old Block Pattern

Replace old block patterns like:
```html
<div class="block">
  <h6>Title</h6>
  <div class="content">...</div>
</div>
```

With:
```html
<app-content-block title="Title">
  <div class="content">...</div>
</app-content-block>
``` 