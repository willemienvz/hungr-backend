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
  averageTime:number = 0;
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
    if (this.accountType === 'true'){
      this.layoutMinimised = true;
    }
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

  ngOnInit(): void {
  }

  fetchMenus() {
    this.menus$ = this.firestore
      .collection('menus', (ref) => ref.where('OwnerID', '==', this.userDataID))
      .snapshotChanges();

    // Subscribe to menus and calculate the viewing total
    this.menus$.subscribe({
      next: (menus) => {
        const menuData = menus.map((menu) => menu.payload.doc.data());
        const dailyVisits = this.countVisitsPerDay(menuData);
        this.updateChartOptions(dailyVisits);
        this.viewingTotalCurrentWeek = this.calculateTotalViews(menuData, 7);
        this.viewingTotalPreviousWeek = this.calculateTotalViews(menuData, 14, 7);
        this.viewingTotalLast24Hours = this.calculateTotalViews(menuData, 1);
        this.viewingTotalPrevious24Hours = this.calculateTotalViews(menuData, 2, 1);
        this.calculateAverageViewingTime(menuData);
        this.getMostPopularViewingTime(menuData);
      },
      error: (error) => console.error("Error fetching menus:", error),
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
  
    return dailyVisits;
  }
  fetchRestaurants() {
    this.restaurant$ = this.firestore
      .collection('restuarants', (ref) => ref.where('ownerID', '==', this.userDataID))
      .snapshotChanges();

    this.restaurant$.subscribe({
      next: (restaurants) => {
        const restaurantData = restaurants.map((restaurant) => {
          const restaurantInfo = restaurant.payload.doc.data();
          const restaurantId = restaurantInfo.restaurantID;
          
          console.log("Restaurant:", restaurantId);
          
          this.fetchOrdersForRestaurant(restaurantId);
          
          return restaurantInfo;
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
        },
        error: (error) => console.error(`Error fetching orders for restaurant ${restaurantId}:`, error),
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
    this.mostOrderedCategory = Object.keys(categoryCounts).reduce((a, b) =>
      categoryCounts[a] > categoryCounts[b] ? a : b
    );
    this.leastOrderedCategory = Object.keys(categoryCounts).reduce((a, b) =>
      categoryCounts[a] < categoryCounts[b] ? a : b
    );
    const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1]) // Sort by count in descending order
    .slice(0, 3); // Get the top 3 categories

  // Format the top 3 most ordered categories
    this.topOrderedCategories = sortedCategories.map(([category, count]) => ({ category, count }));
    console.log(this.topOrderedCategories);
  }

  calculateDrinksCategoryChange(orders: any[], days: number) {
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

  updateChartOptions(dailyVisits: { [date: string]: { [menuId: string]: number } }) {
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
        data: Array.from(menuIds),
      },
      xAxis: {
        type: 'category',
        data: dates,
      },
      yAxis: {
        type: 'value',
      },
      series: Array.from(menuIds).map((menuId) => ({
        name: menuId,
        type: 'line',
        smooth: true,
        data: dates.map((date) => dailyVisits[date][menuId] || 0),
        areaStyle: {},
        lineStyle: { color: this.getMenuColor(menuId) },
      })),
    };
  }
  
  getMenuColor(menuId: string): string {
    const colors = ['#1FCC96', '#C49DFF', '#FFA500', '#FF6347'];
    return colors[parseInt(menuId, 10) % colors.length];
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
          areaStyle: {},
          lineStyle: { color: '#1FCC96' },
        },
      ],
    };
  }

  
  
  
  
    calculateAverageViewingTime(menus: Menu[]):void {
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
          console.log(totalViewingTime/60000);
          console.log(totalEntries);
          this.averageTime = Math.round((totalViewingTime/totalEntries)/ 60000);
  }
  
  getMostPopularViewingTime(menus: Menu[]):void {
    
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
  
  
        // Extract day and hour from the key
        const [day, hour] = mostPopularKey.split('-').map(Number);
  
        // Convert day and hour into a readable format
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const period = hour < 12 ? 'AM' : 'PM';
        const formattedHour = hour % 12 || 12;
        this.popularTime = `${daysOfWeek[day]}s, ${formattedHour} ${period}`;
  }
  
}
