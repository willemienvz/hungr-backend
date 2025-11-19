// Example configuration file for customizing breadcrumb labels
// Import this in your app.component.ts or wherever you want to configure custom labels

export const customBreadcrumbLabels = {
  // Override default labels with custom ones
  'dashboard': 'Home Dashboard',
  'menus': 'Menu Management',
  'restaurants': 'Restaurant Setup',
  'specials': 'Promotional Offers',
  'manage-users': 'User Administration',
  'qr-codes': 'QR Code Generator',
  'help': 'Support Center',
  
  // Add custom labels for dynamic routes
  'menus/add-menu': 'New Menu Creation',
  'menus/edit-menu/:menuID': 'Menu Editor',
  'restaurants/add-new-restaurant': 'Restaurant Setup',
  'specials/add-new-special': 'Create Promotion',
  
  // Settings section
  'settings/general': 'Account Settings',
  'settings/billing': 'Billing & Subscription',
  'settings/branding': 'Brand Customization',
  'settings/about-us': 'Company Info'
};

// Usage example:
// In your component or service, inject BreadcrumbService and call:
// this.breadcrumbService.setRouteLabels(customBreadcrumbLabels); 