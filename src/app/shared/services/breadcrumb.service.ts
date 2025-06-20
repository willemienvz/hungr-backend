import { Injectable } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Breadcrumb {
  label: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private breadcrumbsSubject = new BehaviorSubject<Breadcrumb[]>([]);
  public breadcrumbs$: Observable<Breadcrumb[]> = this.breadcrumbsSubject.asObservable();

  // Custom route labels - maps route paths to display names
  private routeLabels: { [key: string]: string } = {
    'dashboard': 'Overview Dashboard',
    'menu-insights': 'Menu Insights',
    'visitor-insights': 'Visitor Insights',
    'sales-insights': 'Sales Insights',
    'settings': 'Settings',
    'settings/general': 'General Settings',
    'settings/about-us': 'About Us',
    'settings/branding': 'Branding',
    'manage-users': 'Manage Users',
    'menus': 'Menus',
    'menus/add-menu': 'Create New Menu',
    'menus/add-menu/:step': 'Create New Menu',
    'menus/edit-menu/:menuID': 'Edit Menu',
    'menus/edit-menu/:menuID/:step': 'Edit Menu',
    'restaurants': 'Restaurants',
    'restaurants/add-new-restaurant': 'Create New Restaurant',
    'restaurants/edit-restaurant': 'Edit Restaurant',
    'qr-codes': 'QR Codes',
    'specials': 'Specials',
    'specials/add-new-special': 'Add New Special',
    'specials/edit-special/:id': 'Edit Special',
    'help': 'Help',
    'help/all-tutorials': 'All Tutorials'
  };

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateBreadcrumbs();
      });
    
    // Initialize breadcrumbs on service creation
    setTimeout(() => this.updateBreadcrumbs(), 0);
  }

  private updateBreadcrumbs(): void {
    const breadcrumbs = this.createBreadcrumbsFromUrl();
    this.breadcrumbsSubject.next(breadcrumbs);
  }



  private createBreadcrumbsFromUrl(): Breadcrumb[] {
    const url = this.router.url;
    
    if (!url || url === '/') {
      return [];
    }

    const segments = url.split('/').filter(segment => segment && !segment.match(/^\d+$/)); // Remove empty and numeric segments
    
    const breadcrumbs: Breadcrumb[] = [];
    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
      currentPath += '/' + segments[i];
      
      // Skip the last segment as it's the current page
      if (i === segments.length - 1) {
        break;
      }
      
      const label = this.getRouteLabel(currentPath.substring(1));
      
      if (label) {
        breadcrumbs.push({ label, url: currentPath });
      }
    }

    return breadcrumbs;
  }

  public getRouteLabel(route: string): string | null {
    // Handle exact matches first
    if (this.routeLabels[route]) {
      return this.routeLabels[route];
    }

    // Handle dynamic routes (with parameters)
    const routeKey = Object.keys(this.routeLabels).find(key => {
      if (key.includes(':')) {
        const pattern = key.replace(/:\w+/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(route);
      }
      return false;
    });

    if (routeKey) {
      return this.routeLabels[routeKey];
    }

    // Handle specific patterns for better labeling
    if (route.startsWith('menus/edit-menu/')) {
      return 'Edit Menu';
    }
    if (route.startsWith('specials/edit-special/')) {
      return 'Edit Special';
    }
    
    return null;
  }

  private extractLabelFromRouteData(route: ActivatedRoute): string | null {
    const title = route.snapshot.data['title'];
    if (title) {
      // Remove HTML tags and submenu text for breadcrumb display
      return title.replace(/<[^>]*>/g, '').split('/')[0].trim();
    }
    return null;
  }

  // Method to get parent route for navigation
  getParentRoute(currentUrl: string): string | null {
    const segments = currentUrl.split('/').filter(segment => segment);
    if (segments.length <= 1) {
      return null;
    }
    
    // Remove the last segment to get parent
    segments.pop();
    return '/' + segments.join('/');
  }

  // Method to update custom route labels
  setRouteLabel(route: string, label: string): void {
    this.routeLabels[route] = label;
  }

  // Method to set multiple route labels at once
  setRouteLabels(labels: { [key: string]: string }): void {
    Object.assign(this.routeLabels, labels);
  }

  // Method to get all current route labels
  getRouteLabels(): { [key: string]: string } {
    return { ...this.routeLabels };
  }

  // Method to get current page title with submenu
  getCurrentPageTitle(): Observable<string> {
    return this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => {
        return this.getPageTitleFromRoute(this.activatedRoute);
      })
    );
  }

  private getPageTitleFromRoute(route: ActivatedRoute): string {
    let child = route.firstChild;
    while (child) {
      if (child.snapshot.data['title']) {
        return child.snapshot.data['title'];
      }
      child = child.firstChild;
    }
    return 'Overview Dashboard';
  }
} 