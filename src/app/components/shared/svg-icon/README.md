# SVG Icon Component

## Overview

The `SvgIconComponent` is a reusable Angular component designed to replace Material Icons with custom SVG icons throughout the Hungr application. It provides a consistent way to manage and display SVG icons with customizable styling.

## Features

- **Reusable**: Single component for all SVG icons
- **Customizable**: Size, color, and CSS classes can be configured
- **Accessible**: Includes proper ARIA labels and semantic markup
- **Extensible**: Easy to add new SVG icons
- **Consistent Styling**: Unified hover effects and transitions

## Usage

### Basic Usage

```html
<app-svg-icon iconName="delete" size="18px" class="dltIcon"></app-svg-icon>
```

### With Click Handler

```html
<app-svg-icon 
  iconName="delete" 
  size="18px" 
  class="dltIcon"
  (click)="onDelete()"
></app-svg-icon>
```

## Available Icons

Currently available icons:

- **delete**: Trash/delete icon (from Vector(1).svg)
- **close**: X/close icon
- **help_outline**: Question mark/help icon

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `iconName` | string | `''` | Name of the icon to display |
| `size` | string | `'16px'` | Size of the icon (width and height) |
| `color` | string | `'#444444'` | Color of the icon |
| `class` | string | `''` | Additional CSS classes |

## Predefined CSS Classes

- **dltIcon**: Red delete icon with hover effects
- **tooltip-icon**: Blue help icon for tooltips

## Adding New Icons

To add a new SVG icon:

1. Open `svg-icon.component.ts`
2. Add your SVG to the `svgIcons` object:

```typescript
'your_icon_name': `<svg viewBox="..." xmlns="http://www.w3.org/2000/svg">
  <path d="..." fill="currentColor"/>
</svg>`
```

3. Use `fill="currentColor"` or `stroke="currentColor"` to make the icon respect the color property

## Migration from Material Icons

Replace material icons like this:

### Before
```html
<i class="material-icons dltIcon" (click)="onDelete()">delete</i>
```

### After  
```html
<app-svg-icon 
  iconName="delete" 
  class="dltIcon" 
  size="18px"
  (click)="onDelete()"
></app-svg-icon>
```

## Best Practices

1. Use semantic icon names (e.g., 'delete', 'edit', 'help')
2. Include proper CSS classes for styling consistency
3. Use `currentColor` in SVG paths to allow color customization
4. Test accessibility with screen readers
5. Keep SVG markup clean and optimized

## Examples

```html
<!-- Delete button -->
<app-svg-icon 
  iconName="delete" 
  class="dltIcon" 
  size="18px"
  (click)="onDeleteItem()"
></app-svg-icon>

<!-- Help tooltip -->
<app-svg-icon 
  iconName="help_outline" 
  class="tooltip-icon" 
  size="20px"
></app-svg-icon>

<!-- Close dialog -->
<app-svg-icon 
  iconName="close" 
  size="24px" 
  color="#666"
  (click)="closeDialog()"
></app-svg-icon>
``` 