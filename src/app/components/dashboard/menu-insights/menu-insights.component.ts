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
  styleUrls: ['./menu-insights.component.scss']
})
export class MenuInsightsComponent {
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

  constructor(
    public authService: AuthService,
    private router: Router,
    private firestore: AngularFirestore
  ) {
    this.authService.getCurrentUserId().then((uid) => {
      if (uid) {
        this.userDataID = uid;
        this.fetchMenus();
        this.fetchRestaurants();
      } else {
        console.log("No authenticated user");
        this.router.navigate(['/signin']);
      }
    });
  }

  ngOnInit(): void {}

  fetchMenus() {
    this.menus$ = this.firestore
      .collection('menus', (ref) => ref.where('OwnerID', '==', this.userDataID))
      .snapshotChanges();

    this.menus$.subscribe({
      next: (menus) => {
        const menuData = menus.map((menu) => menu.payload.doc.data());
        const dailyVisits = this.countVisitsPerDay(menuData);
        this.updateChartOptions(dailyVisits);
        this.viewingTotalCurrentWeek = this.calculateTotalViews(menuData, 7);
        this.viewingTotalLast24Hours = this.calculateTotalViews(menuData, 1);
      },
      error: (error) => console.error("Error fetching menus:", error),
    });
  }

  countVisitsPerDay(menuData: any[]): { [date: string]: { [menuId: string]: number } } {
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
      .collection('restuarants', (ref) => ref.where('ownerID', '==', this.userDataID))
      .snapshotChanges();

    this.restaurant$.subscribe({
      next: (restaurants) => {
        restaurants.forEach((restaurant) => {
          const restaurantId = restaurant.payload.doc.data().restaurantID;
          this.fetchOrdersForRestaurant(restaurantId);
        });
      },
      error: (error) => console.error("Error fetching restaurants:", error),
    });
  }

  fetchOrdersForRestaurant(restaurantId: string) {
    this.firestore
      .collection('orders', (ref) => ref.where('restaurantID', '==', restaurantId))
      .snapshotChanges()
      .subscribe({
        next: (orders) => {
          this.findTopOrderedItems(orders);
          this.updateMostOrderedItemsChart();
          this.calculateCategoryOrders(orders);
          this.calculateCategoryOrderPercentages();
          this.findFrequentItemPairs(orders);
        },
        error: (error) => console.error(`Error fetching orders for restaurant ${restaurantId}:`, error),
      });
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
    this.mostOrderedCategory = Object.keys(categoryCounts).reduce((a, b) =>
      categoryCounts[a] > categoryCounts[b] ? a : b
    );
  }

  calculateCategoryOrderPercentages() {
    const totalOrders = Object.values(this.categoryOrderCounts).reduce((sum, count) => sum + count, 0);

    const categoryPercentages = Object.keys(this.categoryOrderCounts).map(category => ({
      category,
      percentage: ((this.categoryOrderCounts[category] / totalOrders) * 100).toFixed(2),
    }));

    this.updateCategoryPercentageChart(categoryPercentages);
  }

  updateCategoryPercentageChart(categoryPercentages: { category: string; percentage: string }[]) {
    const colors = ['#3CE1AF', '#AFDCFF', '#C8AFEB', '#FFF56E', '#AFDCFF'];
    const dataWithColors = categoryPercentages.map((item, index) => ({
      value: parseFloat(item.percentage),
      name: item.category,
      itemStyle: { color: colors[index % colors.length] },
    }));

    this.chartOptionsCategoryPercentages = {
      tooltip: { trigger: 'item', formatter: (params) => `${params.name}: ${params.value}%` },
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
    const itemNames = this.topOrderedItems.map(item => item.name);
    const itemCounts = this.topOrderedItems.map(item => item.count);

    this.chartOptionsMostOrderedItems = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: itemNames, axisLabel: { rotate: 0, fontSize: 12 } },
      yAxis: { type: 'value', name: 'Order Count' },
      series: [
        {
          name: 'Order Count',
          type: 'bar',
          data: itemCounts,
          itemStyle: { color: '#3CE1AF' },
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
          const pairKey = itemA < itemB ? `${itemA}-${itemB}` : `${itemB}-${itemA}`;

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

  updateChartOptions(dailyVisits: { [date: string]: { [menuId: string]: number } }) {
    const dates = Object.keys(dailyVisits).sort();
    const menuIds = new Set<string>();
  
    // Populate menuIds from dailyVisits data
    dates.forEach(date => {
      Object.keys(dailyVisits[date]).forEach(menuId => menuIds.add(menuId));
    });
  
    // Prepare series data for each menuId
    const seriesData = Array.from(menuIds).map(menuId => ({
      name: menuId,
      type: 'line',
      smooth: true,
      data: dates.map(date => dailyVisits[date][menuId] || 0), // Use 0 if no data for that date
      areaStyle: {},
      lineStyle: { color: this.getMenuColor(menuId) },
    }));
  
    this.chartOptions = {
      title: {
        text: 'Daily Menu Visits',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: Array.from(menuIds),
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
    const colors = ['#1FCC96', '#C49DFF', '#FFA500', '#FF6347'];
    return colors[parseInt(menuId, 10) % colors.length];
  }
}
