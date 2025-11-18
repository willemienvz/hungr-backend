# Unified Component System Documentation

## Overview

This unified component system provides a consistent, maintainable, and scalable foundation for the entire application. All components follow the same design patterns, styling conventions, and interaction models.

## Core Components

### 1. Page Layout (`app-page-layout`)
Provides consistent page structure with header, actions, and content areas.

```html
<app-page-layout
  title="Page Title"
  subtitle="Optional description"
  [actions]="[
    {
      label: '+ Add Item',
      type: 'secondary',
      routerLink: '/add'
    }
  ]"
  [loading]="isLoading">

  <!-- Page content goes here -->
  <app-content-block title="Section Title">
    <!-- Section content -->
  </app-content-block>

</app-page-layout>
```

**Props:**
- `title`: Main page title
- `subtitle`: Optional subtitle
- `actions`: Array of action buttons
- `loading`: Loading state
- `showBackButton`: Show back navigation
- `backRoute`: Back navigation route

### 2. Content Block (`app-content-block`)
Reusable content sections with headers and actions.

```html
<app-content-block
  title="Section Title"
  [showActions]="true"
  [actions]="[{ label: 'Add', class: 'btnSecondary' }]"
  [showFilter]="true"
  [filterOptions]="filterOptions"
  (filterChange)="onFilter($event)">

  <!-- Content -->
</app-content-block>
```

### 3. Data Table (`app-data-table`)
Powerful, sortable table component with actions.

```html
<app-data-table
  [data]="items"
  [columns]="tableColumns"
  [actions]="tableActions"
  [showIndex]="true"
  [loading]="isLoading"
  emptyMessage="No items found"
  (actionClick)="onAction($event)">
</app-data-table>
```

**Column Configuration:**
```typescript
tableColumns: TableColumn[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    format: (value, row) => `${row.firstName} ${row.lastName}`
  },
  {
    key: 'status',
    label: 'Status',
    width: '120px',
    format: (value) => value ? 'Active' : 'Inactive'
  }
];
```

**Action Configuration:**
```typescript
tableActions: TableAction[] = [
  {
    key: 'view',
    label: 'View',
    icon: 'visibility',
    color: 'secondary'
  },
  {
    key: 'edit',
    label: 'Edit',
    icon: 'edit',
    color: 'secondary'
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: 'delete',
    color: 'danger'
  }
];
```

### 4. Status Badge (`app-status-badge`)
Consistent status indicators across the application.

```html
<app-status-badge
  [status]="item.status ? 'active' : 'inactive'"
  [showIcon]="true">
</app-status-badge>
```

**Available Status Types:**
- `active`, `inactive`, `pending`, `expired`
- `draft`, `published`, `completed`
- `error`, `warning`, `success`, `info`

### 5. Stats Card (`app-stats-card`)
Dashboard metric display cards.

```html
<app-stats-card
  title="Total Users"
  [value]="userCount"
  icon="people"
  [trend]="+12%"
  subtitle="vs last month">
</app-stats-card>
```

### 6. Button (`app-button`)
Unified button component with consistent styling.

```html
<app-button
  type="secondary"
  [loading]="isSaving"
  icon="add"
  (buttonClick)="onClick()">
  Add Item
</app-button>
```

**Button Types:**
- `primary`, `secondary`, `tertiary`, `danger`, `gray`, `blue`

### 6.1. Unified Button Classes (CSS Classes)

For simple button styling without component overhead, use the unified CSS classes:

```html
<!-- Primary Button -->
<button class="hungr-btn hungr-btn-primary" (click)="onSave()">Save</button>

<!-- Secondary Button -->
<button class="hungr-btn hungr-btn-secondary" (click)="onCancel()">Cancel</button>

<!-- Tertiary Button -->
<button class="hungr-btn hungr-btn-tertiary" (click)="onReset()">Reset</button>

<!-- Danger Button -->
<button class="hungr-btn hungr-btn-danger" (click)="onDelete()">Delete</button>
```

**Button Migration Status:**
- ✅ **100% Complete** - All legacy button classes (`.btnPrimary`, `.btnSecondary`, `.btnTertiary`) have been migrated to the unified system (`.hungr-btn .hungr-btn-primary`, etc.)
- ✅ **Verification**: 0 instances of legacy button classes remain in the codebase
- ✅ **Date Completed**: 2025

### 7. Form Components

#### Text Input (`app-form-input`)
```html
<app-form-input
  label="Name"
  placeholder="Enter name"
  type="text"
  [required]="true"
  [(ngModel)]="name"
  [showError]="nameError"
  errorMessage="Name is required">
</app-form-input>
```

#### Select Dropdown (`app-form-select`)
```html
<app-form-select
  label="Category"
  placeholder="Select category"
  [options]="categories"
  [(ngModel)]="selectedCategory">
</app-form-select>
```

#### Textarea (`app-form-textarea`)
```html
<app-form-textarea
  label="Description"
  placeholder="Enter description"
  [rows]="3"
  [maxLength]="500"
  [(ngModel)]="description">
</app-form-textarea>
```

## Implementation Pattern

### Page Structure
```html
<app-page-layout
  title="Management Page"
  subtitle="Manage your items"
  [actions]="pageActions"
  [loading]="isLoading">

  <!-- Stats Section -->
  <div class="stats-grid">
    <app-stats-card title="Total" [value]="totalCount" icon="icon">
  </div>

  <!-- Content Sections -->
  <app-content-block title="Items" [showFilter]="true">
    <app-data-table [data]="items" [columns]="columns" [actions]="actions">
    </app-data-table>
  </app-content-block>

</app-page-layout>
```

### Component Structure
```typescript
export class ManagementComponent {
  // Page configuration
  pageActions = [
    {
      label: '+ Add Item',
      type: 'secondary' as const,
      onClick: () => this.addItem()
    }
  ];

  // Table configuration
  columns: TableColumn[] = [...];
  actions: TableAction[] = [...];

  // Data and state
  items: Item[] = [];
  isLoading = false;

  // Action handlers
  onTableAction(event: any) {
    const { action, row } = event;
    // Handle actions
  }
}
```

## Styling Guidelines

### CSS Classes
- Use design tokens from `styles.scss`
- Follow BEM methodology
- Maintain consistent spacing (`--spacing-*`)
- Use semantic color variables (`--color-*`)

### Responsive Design
- Mobile-first approach
- Breakpoints: 768px, 1024px, 1200px
- Use CSS Grid for layouts
- Flexbox for component alignment

## Best Practices

### 1. Component Usage
- Always use shared components instead of custom implementations
- Follow the established patterns for consistency
- Use TypeScript interfaces for type safety

### 2. Data Flow
- Use reactive forms for complex forms
- Implement proper loading states
- Handle errors gracefully with user feedback

### 3. Performance
- Use `OnPush` change detection where possible
- Implement lazy loading for large datasets
- Optimize template expressions

### 4. Accessibility
- Include proper ARIA labels
- Support keyboard navigation
- Maintain sufficient color contrast
- Use semantic HTML elements

## Migration Guide

### Converting Legacy Components

1. **Replace manual HTML tables** with `app-data-table`
2. **Replace custom buttons** with `app-button`
3. **Wrap pages** with `app-page-layout`
4. **Replace custom stats** with `app-stats-card`
5. **Use unified form components** instead of raw HTML

### Example Migration

**Before:**
```html
<div class="inner-page">
  <table>...</table>
  <a class="btnSecondary">Add</a>
</div>
```

**After:**
```html
<app-page-layout title="Page" [actions]="actions">
  <app-data-table [data]="items" [columns]="columns">
  </app-data-table>
</app-page-layout>
```

## Component Library

### Available Components
- ✅ `app-page-layout` - Page structure
- ✅ `app-content-block` - Content sections
- ✅ `app-data-table` - Data display
- ✅ `app-status-badge` - Status indicators
- ✅ `app-stats-card` - Metrics display
- ✅ `app-button` - Buttons
- ✅ `app-form-input` - Text inputs
- ✅ `app-form-select` - Select dropdowns
- ✅ `app-form-textarea` - Text areas
- ✅ `app-loading` - Loading states
- 🔄 `app-modal` - Modal dialogs (planned)
- 🔄 `app-toast` - Notifications (planned)

### Maintenance
- All components are located in `src/app/components/shared/`
- Each component has its own directory with `.ts`, `.html`, `.scss` files
- Follow consistent naming conventions
- Update this documentation when adding new components

## Troubleshooting

### Common Issues
1. **Template parse errors**: Check TypeScript interfaces
2. **Styling issues**: Verify CSS class usage
3. **Data binding**: Ensure proper property binding syntax

### Debug Tips
- Use Angular DevTools for component inspection
- Check browser console for template errors
- Verify data types match component interfaces

---

**Last Updated:** December 2024
**Version:** 1.0.0
**Maintainer:** Development Team
