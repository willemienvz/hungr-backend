import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Menu } from '../../../shared/services/menu';
import { ViewingTime } from '../../../shared/services/viewingTime';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent implements OnInit {
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
  accountType = localStorage.getItem('accountType');
  layoutMinimised: boolean = false;

  list: any[] = [
    { id: 1, name: 'Restaurant Name', description: 'Mains' },
    { id: 2, name: 'Restaurant Name', description: 'Drinks' },
    { id: 3, name: 'Restaurant Name', description: 'Mains' }
  ];
  chartOptions: any;

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
    }).catch((error) => {
      console.error('Error getting user ID:', error);
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
      console.log('All loading operations completed');
    }
  }

  fetchMenus() {
    this.menus$ = this.firestore
      .collection('menus', (ref) => ref.where('OwnerID', '==', this.userDataID))
      .valueChanges();

    this.menus$.subscribe({
      next: (menus) => {
        this.fetchViewingTimes(menus);
        this.completeLoading();
      },
      error: (error) => {
        console.error('Error fetching menus:', error);
        this.completeLoading();
      }
    });
  }

  fetchRestaurants() {
    this.restaurant$ = this.firestore
      .collection('restuarants', (ref) => ref.where('ownerID', '==', this.userDataID))
      .valueChanges();

    this.restaurant$.subscribe({
      next: (restaurants) => {
        console.log('Restaurants fetched:', restaurants);
        this.completeLoading();
      },
      error: (error) => {
        console.error('Error fetching restaurants:', error);
        this.completeLoading();
      }
    });
  }

  fetchViewingTimes(menus: any[]) {
    if (menus.length === 0) {
      this.completeLoading();
      return;
    }

    // Handle both 'menuId' and 'menuID' field variations
    const menuIds = menus.map((menu) => menu.menuId || menu.menuID);
    const menuIdToNameMap: { [menuId: string]: string } = {};
    menus.forEach((menu) => {
      const menuId = menu.menuId || menu.menuID;
      menuIdToNameMap[menuId] = menu.menuName;
    });

    // Get the last 14 days for comparison
    const dates: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Fetch aggregated analytics data
    const tasks: Array<Promise<{ idx: number; dateKey: string; menuId: string; data: any | null }>> = [];
    const dailyVisits: { [date: string]: { [menuId: string]: number } } = {};
    const hourHistogram: { [hour: string]: number } = {};

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

    Promise.all(tasks).then((results) => {
      let currentWeek = 0;
      let previousWeek = 0;
      let last24h = 0;
      let prev24h = 0;
      let totalDuration = 0;
      let totalViews = 0;

      for (const { idx, dateKey, menuId, data } of results) {
        const views = data?.viewCount || 0;
        dailyVisits[dateKey][menuId] = views;
        if (idx < 7) currentWeek += views; else previousWeek += views;
        if (idx === 0) last24h += views; if (idx === 1) prev24h += views;

        if (data) {
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

      // Calculate average viewing time in minutes
      this.averageTime = totalViews > 0 ? Math.round((totalDuration / totalViews) / 60000) : 0;

      // Calculate most popular viewing time from aggregated data
      this.findMostPopularViewingTimeFromAggregates(hourHistogram);

      this.updateChartOptions(dailyVisits, menuIdToNameMap);
      this.completeLoading();
    });
  }

  findMostPopularViewingTimeFromAggregates(hourHistogram: { [hour: string]: number }) {
    if (Object.keys(hourHistogram).length === 0) {
      this.popularTime = '';
      return;
    }

    // Find the most popular hour
    const mostPopularHour = Object.keys(hourHistogram).reduce((a, b) =>
      hourHistogram[a] > hourHistogram[b] ? a : b
    );

    // For now, we'll use a default day since we don't have day data in the histogram
    // In a real implementation, you might want to fetch day-specific data
    const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
    const defaultDay = dayNames[5]; // Default to Friday

    const hourDisplay = parseInt(mostPopularHour) === 0 ? '12am' :
      parseInt(mostPopularHour) === 12 ? '12pm' :
        parseInt(mostPopularHour) > 12 ? `${parseInt(mostPopularHour) - 12}pm` :
          `${parseInt(mostPopularHour)}am`;

    this.popularTime = `${defaultDay}, ${hourDisplay}`;
  }

  getWeeklyDifferenceMessage(): string {
    const difference = this.viewingTotalCurrentWeek - this.viewingTotalPreviousWeek;
    if (this.viewingTotalPreviousWeek === 0) {
      return difference > 0 ? '+100%' : '0%';
    }
    const percentage = (difference / this.viewingTotalPreviousWeek) * 100;
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(0)}%`;
  }

  getDailyDifferenceMessage(): string {
    const difference = this.viewingTotalLast24Hours - this.viewingTotalPrevious24Hours;
    if (this.viewingTotalPrevious24Hours === 0) {
      return difference > 0 ? '+100%' : '0%';
    }
    const percentage = (difference / this.viewingTotalPrevious24Hours) * 100;
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(0)}%`;
  }

  updateChartOptions(dailyVisits: { [date: string]: { [menuId: string]: number } }, menuIdToNameMap: { [menuId: string]: string }) {
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
                { offset: 0, color: color + '40' },
                { offset: 1, color: color + '00' }
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
