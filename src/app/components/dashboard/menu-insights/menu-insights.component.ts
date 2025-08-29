import { Component, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { Observable } from 'rxjs';
import { CategoryService } from '../../../services/category.service';

interface ItemPair {
  itemA: string;
  itemB: string;
  count: number;
}

@Component({
  selector: 'app-menu-insights',
  templateUrl: './menu-insights.component.html',
  styleUrls: ['./menu-insights.component.scss'],
})
export class MenuInsightsComponent implements OnDestroy {
  isLoading: boolean = false;
  userDataID: string = '';
  menus$: Observable<any[]> | undefined;
  restaurant$: Observable<any[]> | undefined;
  viewingTotalCurrentWeek: number = 0;
  viewingTotalPreviousWeek: number = 0;
  viewingTotalLast24Hours: number = 0;
  viewingTotalPrevious24Hours: number = 0;
  mostOrderedCategory: string = '';
  topOrderedItems: { name: string; count: number }[] = [];
  frequentItemPairs: ItemPair[] = [];
  chartOptions: any;
  chartOptionsCategoryPercentages: any;
  chartOptionsMostOrderedItems: any;
  categoryOrderCounts: { [category: string]: number } = {};
  categoryNameMap: { [categoryId: string]: string } = {};

  // Date range properties
  dateFrom: string = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days ago
  dateTo: string = new Date().toISOString().split('T')[0]; // Today
  selectedDateRange: { from: Date; to: Date } = {
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date()
  };

  accountType = localStorage.getItem('accountType');
  layoutMinimised: boolean = false;
  private loadingTimeout: any;

  constructor(
    public authService: AuthService,
    private router: Router,
    private firestore: AngularFirestore,
    private categoryService: CategoryService
  ) {
    if (this.accountType === 'true') {
      this.layoutMinimised = true;
    }
    this.authService.getCurrentUserId().then((uid) => {
      if (uid) {
        this.userDataID = uid;
        this.fetchMenus();
        // fetchRestaurants() removed - orders now handled via aggregated analytics
      } else {
        console.log('No authenticated user');
        this.router.navigate(['/signin']);
      }
    });
  }

  ngOnInit(): void { }

  ngOnDestroy(): void {
    this.clearLoadingTimeout();
  }

  /**
   * Load category names from the database with timeout protection
   */
  private async loadCategoryNames(categoryIds: string[]): Promise<void> {
    if (categoryIds.length === 0) return;

    try {
      console.log('Menu insights: Starting category name loading with timeout');

      // Create a promise that resolves when categories are loaded or times out after 10 seconds
      const categoryPromise = this.categoryService.getCategoriesByIds(categoryIds).toPromise();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Category loading timeout')), 10000)
      );

      const categories = await Promise.race([categoryPromise, timeoutPromise]);

      if (categories) {
        console.log('Menu insights: Categories loaded successfully:', categories.length);
        categories.forEach(cat => {
          this.categoryNameMap[cat.id] = cat.name;
        });
      }
    } catch (error) {
      console.error('Menu insights: Error loading category names:', error);
      // Don't throw - we want this to be non-blocking
    }
  }

  /**
   * Get category name by ID, fallback to ID if name not found
   */
  private getCategoryName(categoryId: string): string {
    return this.categoryNameMap[categoryId] || categoryId;
  }

  /**
   * Clear the loading timeout to prevent forced loading completion
   */
  private clearLoadingTimeout(): void {
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }
  }

  fetchMenus() {
    this.isLoading = true;
    console.log('Menu insights: Starting data fetch, setting loading to true');

    // Add a safety timeout to prevent loading from getting stuck
    this.loadingTimeout = setTimeout(() => {
      if (this.isLoading) {
        console.warn('Menu insights: Main loading timeout reached, forcing loading to false');
        this.isLoading = false;
      }
    }, 15000); // 15 second timeout for main data loading
    // Read aggregated analytics for the selected date range
    // Build UTC date keys to match frontend aggregator buckets
    const dates: string[] = [];
    const fromDate = new Date(this.selectedDateRange.from);
    const toDate = new Date(this.selectedDateRange.to);

    // Generate all dates between from and to (inclusive)
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }

    // Load menus owned by user to map menuIds
    this.menus$ = this.firestore
      .collection('menus', (ref) => ref.where('OwnerID', '==', this.userDataID))
      .snapshotChanges();

    this.menus$.subscribe({
      next: async (menus) => {
        // Create a mapping from menuID to menuName
        const menuIdToNameMap: { [menuId: string]: string } = {};
        const menuIds = menus.map((m) => {
          const menuData = m.payload.doc.data() as any;
          menuIdToNameMap[menuData.menuID] = menuData.menuName;
          return menuData.menuID;
        }).filter(Boolean);

        if (menuIds.length === 0) {
          console.log('No menus found, setting loading to false');
          this.clearLoadingTimeout();
          this.isLoading = false;
          return;
        }

        // Aggregate across dates
        let totalViews7d = 0;
        let totalViews24h = 0;
        const dailyVisits: { [date: string]: { [menuId: string]: number } } = {};
        const categoryCountsAgg: { [categoryId: string]: number } = {};
        const itemCountsAgg: { [itemId: string]: { name: string; count: number } } = {};

        console.log('📊 Menu Insights: Querying dates:', dates);
        console.log('📊 Menu Insights: Menu IDs:', menuIds);

        const tasks: Array<Promise<{ dateKey: string; menuId: string; data: any | null }>> = [];
        for (const dateKey of dates) {
          dailyVisits[dateKey] = {};
          for (const menuId of menuIds) {
            const docRef = this.firestore.firestore.doc(`analytics-aggregated/${dateKey}/menus/${menuId}`);
            tasks.push(
              docRef
                .get()
                .then((snap) => ({ dateKey, menuId, data: snap.exists ? (snap.data() as any) : null }))
                .catch(() => ({ dateKey, menuId, data: null }))
            );
          }
        }
        const results = await Promise.all(tasks);
        console.log('📊 Menu Insights: Analytics results:', results);

        // Check if we have any data at all
        const hasAnyData = results.some(r => r.data !== null);
        console.log('📊 Menu Insights: Has any aggregated data:', hasAnyData);

        for (const { dateKey, menuId, data } of results) {
          const views = data?.viewCount || 0;
          dailyVisits[dateKey][menuId] = views;
          totalViews7d += views;
          if (dateKey === dates[0]) totalViews24h += views;
          const categoryCounts = data?.categoryCounts || {};
          Object.keys(categoryCounts).forEach((cid) => {
            categoryCountsAgg[cid] = (categoryCountsAgg[cid] || 0) + (categoryCounts[cid] || 0);
          });
          const itemCounts = data?.itemCounts || {};
          Object.keys(itemCounts).forEach((iid) => {
            const count = itemCounts[iid] || 0;
            const existing = itemCountsAgg[iid] || { name: iid, count: 0 };
            itemCountsAgg[iid] = { name: existing.name, count: existing.count + count };
          });
        }

        // Update charts and totals
        this.updateChartOptions(dailyVisits, menuIdToNameMap);
        this.viewingTotalCurrentWeek = totalViews7d;
        this.viewingTotalLast24Hours = totalViews24h;

        console.log('📊 Menu Insights: Final totals:', {
          totalViews7d,
          totalViews24h,
          categoryCountsAgg,
          itemCountsAgg
        });

        // If no aggregated data found, show zero values
        if (!hasAnyData) {
          console.log('📊 Menu Insights: No aggregated data found, showing zero values');
          this.viewingTotalCurrentWeek = 0;
          this.viewingTotalLast24Hours = 0;
          this.categoryOrderCounts = {};
          this.mostOrderedCategory = 'No data available';
          this.categoryNameMap = {};
          this.topOrderedItems = [];
          this.updateChartOptions(dailyVisits, menuIdToNameMap);
          this.updateMostOrderedItemsChart();
          console.log('No aggregated data case: setting loading to false');
          this.clearLoadingTimeout();
          this.isLoading = false;
          return;
        }

        // Compute category shares and top items from aggregates
        this.categoryOrderCounts = categoryCountsAgg;
        this.calculateCategoryOrderPercentages();

        // Calculate most ordered category first (don't wait for category names)
        const categoryKeys = Object.keys(categoryCountsAgg);
        const mostOrderedCategoryId = categoryKeys.length > 0
          ? categoryKeys.reduce((a, b) => (categoryCountsAgg[a] > categoryCountsAgg[b] ? a : b))
          : '';

        // Set initial category name (will be ID until names load)
        this.mostOrderedCategory = mostOrderedCategoryId;

        // Load category names asynchronously (non-blocking)
        if (categoryKeys.length > 0) {
          console.log('Loading category names for keys:', categoryKeys);
          this.loadCategoryNames(categoryKeys).then(() => {
            console.log('Category names loaded successfully');
            // Update the category name if it loaded successfully
            const updatedName = this.getCategoryName(mostOrderedCategoryId);
            if (updatedName !== mostOrderedCategoryId) {
              this.mostOrderedCategory = updatedName;
              console.log('Most ordered category updated to:', this.mostOrderedCategory);
            }
          }).catch((error) => {
            console.error('Error loading category names:', error);
            console.log('Keeping category IDs as fallback names');
            // Keep the ID as fallback - already set above
          });
        }

        this.topOrderedItems = Object.entries(itemCountsAgg)
          .map(([_, v]) => v)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        this.updateMostOrderedItemsChart();

        // Main data processing complete - set loading to false immediately
        console.log('Menu insights main data processing complete, setting loading to false');
        this.clearLoadingTimeout();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching menus:', error);
        console.log('Error case: setting loading to false');
        this.clearLoadingTimeout();
        this.isLoading = false;
      },
    });
  }

  // Legacy method - no longer used since we now use aggregated analytics data
  countVisitsPerDay(menuData: any[]): {
    [date: string]: { [menuId: string]: number };
  } {
    console.log('⚠️ countVisitsPerDay called - this is legacy code and should not be used');
    return {};
  }

  fetchRestaurants() {
    // Note: Orders data is now handled through aggregated analytics data
    // This method is kept for compatibility but no longer fetches orders
    console.log('📊 Menu Insights: fetchRestaurants called - orders now handled via aggregated analytics');
  }

  // calculateTotalViews replaced by aggregated reads

  getWeeklyDifferenceMessage(): string {
    return `${this.calculatePercentageDifference(
      this.viewingTotalCurrentWeek,
      this.viewingTotalPreviousWeek
    ).toFixed(0)}%`;
  }

  getDailyDifferenceMessage(): string {
    return `${this.calculatePercentageDifference(
      this.viewingTotalLast24Hours,
      this.viewingTotalPrevious24Hours
    ).toFixed(0)}%`;
  }

  // Legacy method - no longer used since we now use aggregated analytics data
  findTopOrderedItems(orders: any[]) {
    console.log('⚠️ findTopOrderedItems called - this is legacy code and should not be used');
  }

  calculatePercentageDifference(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  }

  // Legacy method - no longer used since we now use aggregated analytics data
  calculateCategoryOrders(orders: any[]) {
    console.log('⚠️ calculateCategoryOrders called - this is legacy code and should not be used');
  }

  calculateCategoryOrderPercentages() {
    const totalOrders = Object.values(this.categoryOrderCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    if (totalOrders === 0) {
      this.updateCategoryPercentageChart([]);
      return;
    }

    const categoryPercentages = Object.keys(this.categoryOrderCounts).map(
      (category) => ({
        category,
        percentage: (
          (this.categoryOrderCounts[category] / totalOrders) *
          100
        ).toFixed(2),
      })
    );

    this.updateCategoryPercentageChart(categoryPercentages);
  }

  updateCategoryPercentageChart(
    categoryPercentages: { category: string; percentage: string }[]
  ) {
    const colors = this.getChartColors();
    const dataWithColors = categoryPercentages.map((item, index) => ({
      value: parseFloat(item.percentage),
      name: item.category,
      itemStyle: { color: colors[index % colors.length] },
    }));

    this.chartOptionsCategoryPercentages = {
      tooltip: {
        trigger: 'item',
        formatter: (params) => `${params.name}: ${params.value}%`,
      },
      series: [
        {
          name: 'Order Percentage',
          type: 'pie',
          data: dataWithColors,
          label: { position: 'inside', formatter: '{b}: {c}%', fontSize: 10 },
        },
      ],
    };
  }

  updateMostOrderedItemsChart() {
    const itemNames = this.topOrderedItems.map((item) => item.name);
    const itemCounts = this.topOrderedItems.map((item) => item.count);

    this.chartOptionsMostOrderedItems = {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: itemNames,
        axisLabel: { rotate: 0, fontSize: 12 },
      },
      yAxis: { type: 'value', name: 'Order Count' },
      series: [
        {
          name: 'Order Count',
          type: 'bar',
          data: itemCounts,
          itemStyle: { color: '#16D3D2' },
          label: { show: true, position: 'top', fontSize: 12 },
        },
      ],
    };
  }

  // Legacy method - no longer used since we now use aggregated analytics data
  findFrequentItemPairs(orders: any[]) {
    console.log('⚠️ findFrequentItemPairs called - this is legacy code and should not be used');
  }

  // Date range methods
  onDateRangeChange(): void {
    // This method is called when date picker values change
    // We don't automatically apply changes to avoid too many API calls
    console.log('📊 Menu Insights: Date range changed:', {
      from: this.dateFrom,
      to: this.dateTo
    });
  }

  applyDateRange(): void {
    console.log('📊 Menu Insights: Applying date range:', {
      from: this.dateFrom,
      to: this.dateTo
    });

    // Validate date range
    if (!this.dateFrom || !this.dateTo) {
      console.warn('📊 Menu Insights: Invalid date range');
      return;
    }

    const fromDate = new Date(this.dateFrom);
    const toDate = new Date(this.dateTo);

    if (fromDate > toDate) {
      console.warn('📊 Menu Insights: From date cannot be after to date');
      return;
    }

    // Update selected date range
    this.selectedDateRange = {
      from: fromDate,
      to: toDate
    };

    // Refetch data with new date range
    this.fetchMenus();
  }

  getDateRangeText(): string {
    if (!this.dateFrom || !this.dateTo) {
      return 'Last 7 days';
    }

    const fromDate = new Date(this.dateFrom);
    const toDate = new Date(this.dateTo);
    const fromStr = fromDate.toLocaleDateString();
    const toStr = toDate.toLocaleDateString();

    if (fromStr === toStr) {
      return fromStr;
    }

    return `${fromStr} - ${toStr}`;
  }



  updateChartOptions(dailyVisits: {
    [date: string]: { [menuId: string]: number };
  }, menuIdToNameMap: { [menuId: string]: string }) {
    const dates = Object.keys(dailyVisits).sort();
    const menuIds = new Set<string>();

    // Populate menuIds from dailyVisits data
    dates.forEach((date) => {
      Object.keys(dailyVisits[date]).forEach((menuId) => menuIds.add(menuId));
    });

    // Prepare series data for each menuId
    const seriesData = Array.from(menuIds).map((menuId) => {
      const color = this.getMenuColor(menuId);
      return {
        name: menuIdToNameMap[menuId] || menuId,
        type: 'line',
        smooth: true,
        data: dates.map((date) => dailyVisits[date][menuId] || 0), // Use 0 if no data for that date
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: color + '40' }, // 25% opacity at top
              { offset: 1, color: color + '00' }  // 0% opacity at bottom
            ]
          }
        },
        lineStyle: { color: color },
      };
    });

    this.chartOptions = {
      title: {
        text: 'Daily Menu Visits',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: Array.from(menuIds).map(menuId => menuIdToNameMap[menuId] || menuId),
        bottom: 0,
      },
      xAxis: {
        type: 'category',
        data: dates,
      },
      yAxis: {
        type: 'value',
        name: 'Views',
      },
      series: seriesData,
    };
  }

  getMenuColor(menuId: string): string {
    const colors = this.getChartColors();
    const hash = Array.from(menuId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  /**
   * Get actual color values from CSS custom properties for chart usage
   */
  private getChartColors(): string[] {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    return [
      computedStyle.getPropertyValue('--hungr-main-color').trim() || '#FE1B54',
      computedStyle.getPropertyValue('--hungr-secondary-color').trim() || '#16D3D2',
      computedStyle.getPropertyValue('--color-tertiary').trim() || '#3CE1AF',
      computedStyle.getPropertyValue('--color-quaternary').trim() || '#9747FF',
      computedStyle.getPropertyValue('--color-success').trim() || '#4CAF50',
      computedStyle.getPropertyValue('--color-warning').trim() || '#FF9800',
      computedStyle.getPropertyValue('--color-error').trim() || '#F44336',
      computedStyle.getPropertyValue('--color-info').trim() || '#2196F3'
    ];
  }




}
