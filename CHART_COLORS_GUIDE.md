# Chart Colors Customization Guide

This guide explains how to customize the colors of the Daily Menu Visits graph in your dashboard.

## Features Added

✅ **Gradient Fills**: Each line now has a beautiful gradient fill from the line color to transparent  
✅ **Configurable Colors**: You can easily change the color palette through an array  
✅ **Consistent Styling**: Applied to both main dashboard and menu insights views  

## How to Customize Colors

### Method 1: Using the setMenuColors() method

```typescript
// In your component
this.setMenuColors([
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Turquoise  
  '#45B7D1', // Sky Blue
  '#96CEB4', // Mint Green
  '#FFEAA7', // Soft Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Seafoam
  '#F7DC6F'  // Golden Yellow
]);
```

### Method 2: Using the example method

```typescript
// Call the pre-configured custom colors
this.setCustomMenuColors();
```

### Method 3: Direct array assignment

```typescript
// You can also directly modify the colors array
this.menuColors = ['#your', '#custom', '#colors', '#here'];
```

## Color Format

- Use **hex color codes** (e.g., '#FF6B6B')
- Colors will cycle through the array if you have more menus than colors
- Each color automatically gets a gradient fill from 25% opacity to 0% opacity

## Default Color Palette

The default colors are:
- `#1FCC96` - Teal Green
- `#C49DFF` - Purple
- `#FFA500` - Orange
- `#FF6347` - Tomato Red
- `#4A90E2` - Blue
- `#F39C12` - Orange
- `#E74C3C` - Red
- `#9B59B6` - Purple

## Gradient Effect

Each line now has:
- **Solid line**: Full opacity color
- **Gradient fill**: Transitions from 25% opacity at the top to 0% opacity at the bottom
- **Smooth appearance**: Creates a beautiful visual effect

## Example Usage

```typescript
// In your component constructor or ngOnInit
ngOnInit() {
  // Set custom brand colors
  this.setMenuColors([
    '#FF6B6B', // Your brand red
    '#4ECDC4', // Your brand teal
    '#45B7D1', // Your brand blue
  ]);
}
```

## Notes

- Colors are assigned based on a hash of the menu ID, so the same menu will always get the same color
- The gradient effect is applied automatically to all lines
- Changes take effect immediately when you call `setMenuColors()`
- Both dashboard views (main and menu insights) use the same color system
