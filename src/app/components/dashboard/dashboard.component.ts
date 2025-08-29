import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Menu } from '../../shared/services/menu';
import { ViewingTime } from '../../shared/services/viewingTime';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  isLoading: boolean = false;
  private loadingOperations: number = 0;
  private pendingRestaurantFetches: number = 0;
  averageTime: number = 0;
  popularTime: string = '';



  userDataID: string = '';
  menus$: Observable<any[]> | undefined;
  restaurant$: Observable<any[]> | undefined;
  viewingTotalCurrentWeek: number = 0;
  viewingTotalPreviousWeek: number = 0;
  viewingTotalLast24Hours: number = 0;
  viewingTotalPrevious24Hours: number = 0;
  totalOrdersCount: number = 0;
  currentWeekOrderCount: number = 0;
  previousWeekOrderCount: number = 0;
  orderMovementPercentage: number = 0;
  currentPeriodOrderValue: number = 0;
  previousPeriodOrderValue: number = 0;
  orderValueMovementPercentage: number = 0;
  currentPeriodTipValue: number = 0;
  previousPeriodTipValue: number = 0;
  tipValueMovementPercentage: number = 0;
  topOrderedItems: { name: string; count: number }[] = [];
  categoryOrderCounts: { [category: string]: number } = {};
  mostOrderedCategory: string = '';
  leastOrderedCategory: string = '';
  drinksCategoryOrderChange: number = 0;
  accountType = localStorage.getItem('accountType');
  layoutMinimised: boolean = false;

  list: any[] = [
    { id: 1, name: 'Restaurant Name', description: 'Mains' },
    { id: 2, name: 'Restaurant Name', description: 'Drinks' },
    { id: 3, name: 'Restaurant Name', description: 'Mains' }
  ];
  chartOptions: any;
  chartOptionsSales: any;
  topOrderedCategories: { category: string; count: number; }[];


  constructor(
    public authService: AuthService,
    private router: Router,
    private firestore: AngularFirestore
  ) {
    if (this.accountType === 'true') {
      this.layoutMinimised = true;
    }
    this.authService.getCurrentUserId().then((uid) => {
      if (uid) {
        this.userDataID = uid;
        this.startLoading();
        this.fetchMenus();
        this.fetchRestaurants();
      } else {
        console.log("No authenticated user");
        this.router.navigate(['/signin']);
      }
    });
  }

  ngOnInit(): void {
  }

  /**
   * Start a loading operation
   */
  private startLoading(): void {
    this.loadingOperations++;
    this.isLoading = true;
    console.log('Loading started, operations count:', this.loadingOperations);
  }

  /**
   * Complete a loading operation
   */
  private completeLoading(): void {
    this.loadingOperations--;
    console.log('Loading completed, operations remaining:', this.loadingOperations);

    // Only set loading to false if all operations are complete AND no restaurant fetches are pending
    if (this.loadingOperations <= 0 && this.pendingRestaurantFetches <= 0) {
      this.loadingOperations = 0;
      this.pendingRestaurantFetches = 0;
      this.isLoading = false;
      console.log('All loading operations completed, isLoading set to false');
    }
  }

  /**
   * Complete a restaurant order fetch operation
   */
  private completeRestaurantFetch(): void {
    this.pendingRestaurantFetches--;
    console.log('Restaurant fetch completed, remaining:', this.pendingRestaurantFetches);

    // Check if we can complete loading now
    if (this.loadingOperations <= 0 && this.pendingRestaurantFetches <= 0) {
      this.loadingOperations = 0;
      this.pendingRestaurantFetches = 0;
      this.isLoading = false;
      console.log('All operations completed, isLoading set to false');
    }
  }

  fetchMenus() {
    // Read aggregated analytics for the last 14 days to compute current vs previous week
    // Build UTC date keys to match frontend aggregator buckets
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      d.setUTCDate(d.getUTCDate() - i);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }

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

        if (menuIds.length === 0) { this.isLoading = false; return; }

        let currentWeek = 0;
        let previousWeek = 0;
        let last24h = 0;
        let prev24h = 0;
        let currentOrderValue = 0;
        let previousOrderValue = 0;
        let totalDuration = 0;
        let totalViews = 0;
        const dailyVisits: { [date: string]: { [menuId: string]: number } } = {};
        const hourHistogram: { [hour: string]: number } = {};

        // Prepare all document fetches in parallel to reduce round trips
        const tasks: Array<Promise<{ idx: number; dateKey: string; menuId: string; data: any | null }>> = [];
        for (const [idx, dateKey] of dates.entries()) {
          dailyVisits[dateKey] = {};
          for (const menuId of menuIds) {
            const docRef = this.firestore.firestore.doc(`analytics-aggregated/${dateKey}/menus/${menuId}`);
            tasks.push(
              docRef
                .get()
                .then((snap) => ({ idx, dateKey, menuId, data: snap.exists ? (snap.data() as any) : null }))
                .catch(() => ({ idx, dateKey, menuId, data: null }))
            );
          }
        }

        const results = await Promise.all(tasks);
        for (const { idx, dateKey, menuId, data } of results) {
          const views = data?.viewCount || 0;
          dailyVisits[dateKey][menuId] = views;
          if (idx < 7) currentWeek += views; else previousWeek += views;
          if (idx === 0) last24h += views; if (idx === 1) prev24h += views;
          if (data) {
            const orderValueTotal = Number(data.orderValueTotal || 0);
            if (idx < 7) currentOrderValue += orderValueTotal; else previousOrderValue += orderValueTotal;

            // Accumulate viewing time data for average calculation
            totalDuration += data?.viewDurationMs || 0;
            totalViews += views;

            // Accumulate hour histogram data
            const hh = data?.hourHistogram || {};
            Object.keys(hh).forEach(h => {
              hourHistogram[h] = (hourHistogram[h] || 0) + (hh[h] || 0);
            });
          }
        }

        this.viewingTotalCurrentWeek = currentWeek;
        this.viewingTotalPreviousWeek = previousWeek;
        this.viewingTotalLast24Hours = last24h;
        this.viewingTotalPrevious24Hours = prev24h;
        this.currentPeriodOrderValue = currentOrderValue;
        this.previousPeriodOrderValue = previousOrderValue;

        // Calculate average viewing time in minutes
        this.averageTime = totalViews > 0 ? Math.round((totalDuration / totalViews) / 60000) : 0;

        console.log('📊 Dashboard Analytics Summary:');
        console.log('  - Total views:', totalViews);
        console.log('  - Total duration:', totalDuration);
        console.log('  - Average time:', this.averageTime, 'minutes');
        console.log('  - Hour histogram:', hourHistogram);

        // Calculate most popular viewing time from aggregated analytics data
        this.getMostPopularViewingTimeFromAggregates(hourHistogram);

        this.updateChartOptions(dailyVisits, menuIdToNameMap);
        this.completeLoading();
      },
      error: (error) => {
        console.error("Error fetching menus:", error);
        this.completeLoading();
      },
    });
  }
  countVisitsPerDay(menuData: any[]): { [date: string]: { [menuId: string]: number } } {
    console.log(menuData);
    const dailyVisits: { [date: string]: { [menuId: string]: number } } = {};

    menuData.forEach((menu) => {
      const menuId = menu['menuName'];
      const viewingTimes = menu['viewingTime'] || [];

      viewingTimes.forEach((view: any) => {
        const viewDate = new Date(view.timestamp).toLocaleDateString();

        if (!dailyVisits[viewDate]) {
          dailyVisits[viewDate] = {};
        }
        if (!dailyVisits[viewDate][menuId]) {
          dailyVisits[viewDate][menuId] = 0;
        }

        dailyVisits[viewDate][menuId]++;
      });
    });

    this.completeLoading();
    return dailyVisits;
  }
  fetchRestaurants() {
    this.restaurant$ = this.firestore
      .collection('restuarants', (ref) => ref.where('ownerID', '==', this.userDataID))
      .snapshotChanges();

    this.restaurant$.subscribe({
      next: (restaurants) => {
        const restaurantIds = restaurants.map((restaurant) => {
          const restaurantInfo = restaurant.payload.doc.data();
          return restaurantInfo.restaurantID;
        });

        console.log("Found restaurants:", restaurantIds.length);

        if (restaurantIds.length === 0) {
          // No restaurants, complete loading
          this.completeLoading();
          return;
        }

        // Track how many restaurant order fetches we need to complete
        this.pendingRestaurantFetches = restaurantIds.length;

        // Start fetching orders for each restaurant
        restaurantIds.forEach(restaurantId => {
          this.fetchOrdersForRestaurant(restaurantId);
        });
      },
      error: (error) => {
        console.error("Error fetching restaurants:", error);
        this.completeLoading();
      },
    });
  }

  fetchOrdersForRestaurant(restaurantId: string) {
    this.firestore
      .collection('orders', (ref) => ref.where('restaurantID', '==', restaurantId))
      .snapshotChanges()
      .subscribe({
        next: (orders) => {
          try {
            const monthlyTotals = this.countOrdersPerMonth(orders);
            this.updateMonthlyOrderChart(monthlyTotals);
            this.calculateOrderAndTipValues(orders, 30);
            const currentWeekCount = this.countOrdersWithinPeriod(orders, 7, 0);
            const previousWeekCount = this.countOrdersWithinPeriod(orders, 7, 7);
            this.currentWeekOrderCount += currentWeekCount;
            this.previousWeekOrderCount += previousWeekCount;
            this.calculateOrderMovementPercentage();
            this.findTopOrderedItems(orders);
            this.calculateCategoryOrders(orders);
            this.calculateDrinksCategoryChange(orders, 30);
            this.completeRestaurantFetch();
          } catch (error) {
            console.error(`Error processing orders for restaurant ${restaurantId}:`, error);
            this.completeRestaurantFetch();
          }
        },
        error: (error) => {
          console.error(`Error fetching orders for restaurant ${restaurantId}:`, error);
          this.completeRestaurantFetch();
        },
      });
  }

  countOrdersWithinPeriod(orders: any[], days: number, offset: number): number {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days - offset);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - offset);

    return orders.reduce((count, order) => {
      const orderData = order.payload.doc.data();
      const orderItems = orderData.items;
      const orderTimestamp = orderData.items[0]?.timeOrdered?.seconds * 1000;

      if (orderItems?.length > 0 && orderTimestamp) {
        const orderDate = new Date(orderTimestamp);
        if (orderDate >= startDate && orderDate < endDate) {
          return count + 1;
        }
      }
      return count;
    }, 0);
  }
  calculateTotalViews(menuData: any[], days: number, offset: number = 0): number {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days - offset);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - offset);

    return menuData.reduce((acc, menu) => {
      const filteredViews = (menu['viewingTime'] || []).filter((view) => {
        const viewDate = new Date(view.timestamp);
        return viewDate >= startDate && viewDate < endDate;
      });
      return acc + filteredViews.length;
    }, 0);
  }

  getWeeklyDifferenceMessage(): string {
    const difference = this.calculatePercentageDifference(
      this.viewingTotalCurrentWeek,
      this.viewingTotalPreviousWeek
    ).toFixed(0);
    return `${difference}%`;
  }

  get displayAverageTime(): number {
    return isNaN(this.averageTime) ? 0 : this.averageTime;
  }


  // Function to calculate the percentage difference between the last 24 hours and the 24 hours before
  getDailyDifferenceMessage(): string {
    const difference = this.calculatePercentageDifference(
      this.viewingTotalLast24Hours,
      this.viewingTotalPrevious24Hours
    ).toFixed(0);
    return `${difference}%`;
  }

  calculateOrderAndTipValues(orders: any[], days: number) {
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(currentPeriodStart.getDate() - days);
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - 2 * days);

    let currentOrderValue = 0;
    let previousOrderValue = 0;
    let currentTipValue = 0;
    let previousTipValue = 0;

    orders.forEach((order) => {
      const orderData = order.payload.doc.data();
      const orderTimestamp = orderData.items[0]?.timeOrdered?.seconds * 1000;
      const orderTotal = parseFloat(orderData.totalAmount || '0');
      const tipAmount = parseFloat(orderData.tipAmount || '0');

      if (orderTimestamp) {
        const orderDate = new Date(orderTimestamp);

        if (orderDate >= currentPeriodStart) {
          currentOrderValue += orderTotal;
          currentTipValue += tipAmount;
        } else if (orderDate >= previousPeriodStart && orderDate < currentPeriodStart) {
          previousOrderValue += orderTotal;
          previousTipValue += tipAmount;
        }
      }
    });

    this.currentPeriodOrderValue = currentOrderValue;
    this.previousPeriodOrderValue = previousOrderValue;
    this.currentPeriodTipValue = currentTipValue;
    this.previousPeriodTipValue = previousTipValue;

    this.orderValueMovementPercentage = this.calculatePercentageDifference(currentOrderValue, previousOrderValue);
    this.tipValueMovementPercentage = this.calculatePercentageDifference(currentTipValue, previousTipValue);
  }
  findTopOrderedItems(orders: any[]) {
    const itemCounts: { [key: string]: { name: string; count: number } } = {};

    orders.forEach((order) => {
      const orderData = order.payload.doc.data();
      orderData.items.forEach((item: any) => {
        if (itemCounts[item.itemId]) {
          itemCounts[item.itemId].count += item.quantity;
        } else {
          itemCounts[item.itemId] = { name: item.name, count: item.quantity };
        }
      });
    });

    this.topOrderedItems = Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3); // Get top 3 items
  }


  calculatePercentageDifference(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  }

  calculateOrderMovementPercentage() {
    if (this.previousWeekOrderCount === 0) {
      this.orderMovementPercentage = this.currentWeekOrderCount > 0 ? 100 : 0;
    } else {
      this.orderMovementPercentage = ((this.currentWeekOrderCount - this.previousWeekOrderCount) / this.previousWeekOrderCount) * 100;
    }
  }

  getOrderValueMovementMessage(): string {
    return `Order value movement: ${this.orderValueMovementPercentage.toFixed(2)}%`;
  }

  getTipValueMovementMessage(): string {
    return `Tip value movement: ${this.tipValueMovementPercentage.toFixed(2)}%`;
  }

  getTopOrderedItemsMessage(): string {
    return `Top 3 ordered items: ${this.topOrderedItems.map(item => `${item.name} (${item.count})`).join(', ')}`;
  }
  calculateCategoryOrders(orders: any[]) {
    const categoryCounts: { [category: string]: number } = {};

    orders.forEach((order) => {
      const orderData = order.payload.doc.data();
      orderData.items.forEach((item: any) => {
        const category = item.category;
        if (categoryCounts[category]) {
          categoryCounts[category] += item.quantity;
        } else {
          categoryCounts[category] = item.quantity;
        }
      });
    });

    this.categoryOrderCounts = categoryCounts;

    // Determine most and least ordered categories
    const categoryKeys = Object.keys(categoryCounts);
    if (categoryKeys.length === 0) {
      this.mostOrderedCategory = '';
      this.leastOrderedCategory = '';
      this.topOrderedCategories = [];
      return;
    }
    this.mostOrderedCategory = categoryKeys.reduce((a, b) =>
      categoryCounts[a] > categoryCounts[b] ? a : b
    );
    this.leastOrderedCategory = categoryKeys.reduce((a, b) =>
      categoryCounts[a] < categoryCounts[b] ? a : b
    );
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by count in descending order
      .slice(0, 3); // Get the top 3 categories

    // Format the top 3 most ordered categories
    this.topOrderedCategories = sortedCategories.map(([category, count]) => ({ category, count }));
    console.log(this.topOrderedCategories);
  }

  calculateDrinksCategoryChange(orders: any[], days: number): void {
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(currentPeriodStart.getDate() - days);
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - 2 * days);

    let currentDrinksCount = 0;
    let previousDrinksCount = 0;

    orders.forEach((order) => {
      const orderData = order.payload.doc.data();
      orderData.items.forEach((item: any) => {
        if (item.category === 'Drinks') {
          const orderTimestamp = item.timeOrdered?.seconds * 1000;
          const orderDate = new Date(orderTimestamp);

          if (orderDate >= currentPeriodStart) {
            currentDrinksCount += item.quantity;
          } else if (orderDate >= previousPeriodStart && orderDate < currentPeriodStart) {
            previousDrinksCount += item.quantity;
          }
        }
      });
    });

    this.drinksCategoryOrderChange = this.calculatePercentageDifference(currentDrinksCount, previousDrinksCount);
  }

  updateChartOptions(dailyVisits: { [date: string]: { [menuId: string]: number } }, menuIdToNameMap: { [menuId: string]: string }): void {
    const dates = Object.keys(dailyVisits).sort();
    const menuIds = new Set<string>();

    const seriesData = dates.map((date) => {
      const dailyData = dailyVisits[date];
      Object.keys(dailyData).forEach((menuId) => menuIds.add(menuId));
      return dailyData;
    });

    this.chartOptions = {
      title: {
        text: '',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: Array.from(menuIds).map(menuId => menuIdToNameMap[menuId] || menuId),
      },
      xAxis: {
        type: 'category',
        data: dates,
      },
      yAxis: {
        type: 'value',
      },
      series: Array.from(menuIds).map((menuId) => {
        const color = this.getMenuColor(menuId);
        return {
          name: menuIdToNameMap[menuId] || menuId,
          type: 'line',
          smooth: true,
          data: dates.map((date) => dailyVisits[date][menuId] || 0),
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
      }),
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

  countOrdersPerMonth(orders: any[]): { [month: string]: number } {
    const monthlyTotals: { [month: string]: number } = {};

    orders.forEach((order) => {
      const orderData = order.payload.doc.data();
      console.log('t', orderData);
      const orderTimestamp = orderData.items[0]?.timeOrdered?.seconds * 1000;
      const orderTotal = parseFloat(orderData.orderTotal || '0');

      if (orderTimestamp) {
        const orderDate = new Date(orderTimestamp);
        const month = orderDate.toLocaleString('default', { month: 'short', year: 'numeric' });

        if (!monthlyTotals[month]) {
          monthlyTotals[month] = 0;
        }
        monthlyTotals[month] += orderTotal;
      }
    });

    return monthlyTotals;
  }

  updateMonthlyOrderChart(monthlyTotals: { [month: string]: number }) {
    const months = Object.keys(monthlyTotals).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const orderTotals = months.map((month) => monthlyTotals[month]);

    this.chartOptionsSales = {
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: months,
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: 'Order Total',
          type: 'line',
          smooth: true,
          data: orderTotals,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#1FCC9640' }, // 25% opacity at top
                { offset: 1, color: '#1FCC9600' }  // 0% opacity at bottom
              ]
            }
          },
          lineStyle: { color: '#1FCC96' },
        },
      ],
    };
  }





  calculateAverageViewingTime(menus: Menu[]): void {
    let totalViewingTime = 0;
    let totalEntries = 0;

    menus.forEach((menu) => {
      if (menu.viewingTime && Array.isArray(menu.viewingTime)) {
        menu.viewingTime.forEach((entry: { time: number }) => {
          totalViewingTime += entry.time;
          totalEntries++;
        });
      }
    });
    console.log(totalViewingTime / 60000);
    console.log(totalEntries);
    this.averageTime = Math.round((totalViewingTime / totalEntries) / 60000);
  }

  getMostPopularViewingTime(menus: Menu[]): void {

    const viewingTimeMap: { [key: string]: number } = {};

    menus.forEach((menu) => {
      if (menu.viewingTime && Array.isArray(menu.viewingTime)) {
        menu.viewingTime.forEach((view: ViewingTime) => {
          const key = `${view.day}-${view.hour}`;
          viewingTimeMap[key] = (viewingTimeMap[key] || 0) + view.time;
        });
      }
    });

    // Find the most popular day-hour
    let mostPopularKey = '';
    let maxTime = 0;

    for (const key in viewingTimeMap) {
      if (viewingTimeMap[key] > maxTime) {
        mostPopularKey = key;
        maxTime = viewingTimeMap[key];
      }
    }

    // If no viewing time data found, set a default message
    if (!mostPopularKey) {
      this.popularTime = 'No data available';
      return;
    }

    // Extract day and hour from the key
    const [day, hour] = mostPopularKey.split('-').map(Number);

    // Convert day and hour into a readable format
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const period = hour < 12 ? 'AM' : 'PM';
    const formattedHour = hour % 12 || 12;
    this.popularTime = `${daysOfWeek[day]}s, ${formattedHour} ${period}`;
  }

  getMostPopularViewingTimeFromAggregates(hourHistogram: { [hour: string]: number }): void {
    console.log('🔍 Calculating most popular viewing time from histogram:', hourHistogram);

    // Find the hour with the most views
    let mostPopularHour = '';
    let maxViews = 0;

    for (const hour in hourHistogram) {
      if (hourHistogram[hour] > maxViews) {
        mostPopularHour = hour;
        maxViews = hourHistogram[hour];
      }
    }

    console.log('🔍 Most popular hour:', mostPopularHour, 'with', maxViews, 'views');

    // If no viewing time data found, set a default message
    if (!mostPopularHour) {
      this.popularTime = 'No data available';
      console.log('⚠️ No viewing time data found, showing "No data available"');
      return;
    }

    // Convert hour to readable format
    const hour = parseInt(mostPopularHour, 10);
    const period = hour < 12 ? 'AM' : 'PM';
    const formattedHour = hour % 12 || 12;
    this.popularTime = `${formattedHour} ${period}`;
    console.log('✅ Most popular viewing time set to:', this.popularTime);
  }

}
