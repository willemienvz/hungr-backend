import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { Observable } from 'rxjs';

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
export class MenuInsightsComponent {
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

  accountType = localStorage.getItem('accountType');
  layoutMinimised: boolean = false;

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
        this.fetchMenus();
        this.fetchRestaurants();
      } else {
        console.log('No authenticated user');
        this.router.navigate(['/signin']);
      }
    });
  }

  ngOnInit(): void {}

  fetchMenus() {
    this.isLoading = true;
    // Read aggregated analytics for the last 7 days for all menus owned by this user
    // Build UTC date keys to match frontend aggregator buckets
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      d.setUTCDate(d.getUTCDate() - i);
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
        
        if (menuIds.length === 0) { this.isLoading = false; return; }

        // Aggregate across dates
        let totalViews7d = 0;
        let totalViews24h = 0;
        const dailyVisits: { [date: string]: { [menuId: string]: number } } = {};
        const categoryCountsAgg: { [categoryId: string]: number } = {};
        const itemCountsAgg: { [itemId: string]: { name: string; count: number } } = {};

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

        // Compute category shares and top items from aggregates
        this.categoryOrderCounts = categoryCountsAgg;
        this.calculateCategoryOrderPercentages();

        this.topOrderedItems = Object.entries(itemCountsAgg)
          .map(([_, v]) => v)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        this.updateMostOrderedItemsChart();
        this.isLoading = false;
      },
      error: (error) => { console.error('Error fetching menus:', error); this.isLoading = false; },
    });
  }

  countVisitsPerDay(menuData: any[]): {
    [date: string]: { [menuId: string]: number };
  } {
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

    return dailyVisits;
  }

  fetchRestaurants() {
    this.restaurant$ = this.firestore
      .collection('restuarants', (ref) =>
        ref.where('ownerID', '==', this.userDataID)
      )
      .snapshotChanges();

    this.restaurant$.subscribe({
      next: (restaurants) => {
        restaurants.forEach((restaurant) => {
          const restaurantId = restaurant.payload.doc.data().restaurantID;
          this.fetchOrdersForRestaurant(restaurantId);
        });
      },
      error: (error) => console.error('Error fetching restaurants:', error),
    });
  }

  fetchOrdersForRestaurant(restaurantId: string) {
    this.firestore
      .collection('orders', (ref) =>
        ref.where('restaurantID', '==', restaurantId)
      )
      .snapshotChanges()
      .subscribe({
        next: (orders) => {
          this.findTopOrderedItems(orders);
          this.updateMostOrderedItemsChart();
          this.calculateCategoryOrders(orders);
          this.calculateCategoryOrderPercentages();
          this.findFrequentItemPairs(orders);
        },
        error: (error) =>
          console.error(
            `Error fetching orders for restaurant ${restaurantId}:`,
            error
          ),
      });
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
      .slice(0, 3);
  }

  calculatePercentageDifference(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
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
    const keys = Object.keys(categoryCounts);
    this.mostOrderedCategory = keys.length
      ? keys.reduce((a, b) => (categoryCounts[a] > categoryCounts[b] ? a : b))
      : '';
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
    const colors = ['#16D3D2', '#AFDCFF', '#C8AFEB', '#FFF56E', '#AFDCFF'];
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

  findFrequentItemPairs(orders: any[]) {
    const pairCounts: { [pair: string]: number } = {};

    orders.forEach((order) => {
      const items = order.payload.doc.data().items;

      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const itemA = items[i].name;
          const itemB = items[j].name;
          const pairKey =
            itemA < itemB ? `${itemA}-${itemB}` : `${itemB}-${itemA}`;

          if (pairCounts[pairKey]) {
            pairCounts[pairKey]++;
          } else {
            pairCounts[pairKey] = 1;
          }
        }
      }
    });

    this.frequentItemPairs = Object.entries(pairCounts)
      .map(([pair, count]) => {
        const [itemA, itemB] = pair.split('-');
        return { itemA, itemB, count };
      })
      .sort((a, b) => b.count - a.count);
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

  // Configurable color array for menu lines
  private menuColors: string[] = ['#1FCC96', '#C49DFF', '#FFA500', '#FF6347', '#4A90E2', '#F39C12', '#E74C3C', '#9B59B6'];

  getMenuColor(menuId: string): string {
    const hash = Array.from(menuId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return this.menuColors[hash % this.menuColors.length];
  }

  // Method to update the color array
  setMenuColors(colors: string[]): void {
    this.menuColors = colors;
  }

  // Example method to set custom colors
  setCustomMenuColors(): void {
    // Example: Set custom colors for your brand
    const customColors = [
      '#FF6B6B', // Coral Red
      '#4ECDC4', // Turquoise
      '#45B7D1', // Sky Blue
      '#96CEB4', // Mint Green
      '#FFEAA7', // Soft Yellow
      '#DDA0DD', // Plum
      '#98D8C8', // Seafoam
      '#F7DC6F'  // Golden Yellow
    ];
    this.setMenuColors(customColors);
  }
}
