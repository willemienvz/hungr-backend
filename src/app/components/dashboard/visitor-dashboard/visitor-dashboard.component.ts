import { Component } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Menu } from '../../../shared/services/menu';
import { ViewingTime } from '../../../shared/services/viewingTime';

@Component({
  selector: 'app-visitor-dashboard',
  templateUrl: './visitor-dashboard.component.html',
  styleUrl: './visitor-dashboard.component.scss'
})
export class VisitorDashboardComponent {
  isLoading: boolean = false;
  userDataID: string = '';
  menus$: Observable<any[]> | undefined;
  restaurant$: Observable<any[]> | undefined;
  averageTime: number = 0;
  popularTime: string = '';

  options: any; // Chart options for ECharts
  activeDay: number = 0; // Active tab index (0 = Sunday)
  daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  dayData: { [key: string]: { hour: number; viewCount: number }[] } = {};

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
      } else {
        console.log("No authenticated user");
        this.router.navigate(['/signin']);
      }
    });
  }


  fetchMenus() {
    this.isLoading = true;
    // Load menus and then read aggregated viewing durations and hour histograms for last 30 days
    this.menus$ = this.firestore
      .collection('menus', (ref) => ref.where('OwnerID', '==', this.userDataID))
      .snapshotChanges();

    this.menus$.subscribe({
      next: async (menus) => {
        const menuIds = menus.map((m) => (m.payload.doc.data() as any).menuID).filter(Boolean);
        if (menuIds.length === 0) { this.isLoading = false; return; }

        const today = new Date();
        const dates: string[] = [];
        for (let i = 0; i < 30; i++) {
          const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
          d.setUTCDate(d.getUTCDate() - i);
          const yyyy = d.getUTCFullYear();
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(d.getUTCDate()).padStart(2, '0');
          dates.push(`${yyyy}-${mm}-${dd}`);
        }

        // Accumulate durations and hour histograms
        let totalDuration = 0;
        let totalViews = 0;
        const hourHistogram: { [hour: string]: number } = {};

        const tasks: Array<Promise<{ dateKey: string; data: any | null }>> = [];
        for (const dateKey of dates) {
          for (const menuId of menuIds) {
            const docRef = this.firestore.firestore.doc(`analytics-aggregated/${dateKey}/menus/${menuId}`);
            tasks.push(
              docRef
                .get()
                .then((snap) => ({ dateKey, data: snap.exists ? (snap.data() as any) : null }))
                .catch(() => ({ dateKey, data: null }))
            );
          }
        }
        const results = await Promise.all(tasks);
        console.log('Analytics results:', results);

        // Check if we have any data at all
        const hasAnyData = results.some(r => r.data !== null);
        console.log('Has any aggregated data:', hasAnyData);

        if (!hasAnyData) {
          console.log('No aggregated analytics data found. Checking for raw analytics events...');
          // Try to check if there are any raw analytics events
          const eventsQuery = this.firestore.firestore.collection('analytics-events').limit(1);
          const eventsSnap = await eventsQuery.get();
          console.log('Raw analytics events exist:', !eventsSnap.empty);
        }

        for (const { dateKey, data } of results) {
          if (data) {
            console.log(`Data for ${dateKey}:`, data);
            totalDuration += data?.viewDurationMs || 0;
            totalViews += data?.viewCount || 0;
            const hh = data?.hourHistogram || {};
            console.log(`Hour histogram for ${dateKey}:`, hh);
            Object.keys(hh).forEach(h => {
              hourHistogram[h] = (hourHistogram[h] || 0) + (hh[h] || 0);
            });
          }
        }
        console.log('Final hourHistogram:', hourHistogram);
        console.log('Total views:', totalViews);
        console.log('Total duration:', totalDuration);

        // Average view time in ms
        this.averageTime = totalViews > 0 ? Math.round((totalDuration / totalViews) / 60000) : 0;

        // Calculate most popular viewing time from aggregated analytics data
        this.getMostPopularViewingTimeFromAggregates(hourHistogram);

        // If no aggregated data, fall back to raw viewing time data
        if (totalViews === 0) {
          console.log('No aggregated data found, falling back to raw viewing time data');
          const menuData = menus.map(m => m.payload.doc.data() as Menu);
          this.calculateAverageViewingTime(menuData);
          this.processData(menuData);

          // If still no data, generate sample data for testing
          if (this.averageTime === 0) {
            console.log('No viewing time data found, generating sample data for testing');
            this.generateSampleData();
          }
        } else {
          // Map histogram to dayData for the active day chart (showing view counts per hour)
          const mapped = Array(24).fill(0).map((_, h) => ({ hour: h, viewCount: 0 }));
          Object.keys(hourHistogram).forEach(h => {
            const hour = parseInt(h, 10);
            if (!isNaN(hour) && hour >= 0 && hour < 24) {
              mapped[hour] = { hour, viewCount: hourHistogram[h] };
            }
          });
          this.dayData[this.activeDay] = mapped;
          console.log('Mapped dayData for active day:', this.dayData[this.activeDay]);
        }

        this.setChartOptions();
        this.isLoading = false;
      },
      error: (error) => { console.error("Error fetching menus:", error); this.isLoading = false; },
    });
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
    console.log('🔍 Visitor Dashboard: Calculating most popular viewing time from histogram:', hourHistogram);

    // Find the hour with the most views
    let mostPopularHour = '';
    let maxViews = 0;

    for (const hour in hourHistogram) {
      if (hourHistogram[hour] > maxViews) {
        mostPopularHour = hour;
        maxViews = hourHistogram[hour];
      }
    }

    console.log('🔍 Visitor Dashboard: Most popular hour:', mostPopularHour, 'with', maxViews, 'views');

    // If no viewing time data found, set a default message
    if (!mostPopularHour) {
      this.popularTime = 'No data available';
      console.log('⚠️ Visitor Dashboard: No viewing time data found, showing "No data available"');
      return;
    }

    // Convert hour to readable format
    const hour = parseInt(mostPopularHour, 10);
    const period = hour < 12 ? 'AM' : 'PM';
    const formattedHour = hour % 12 || 12;
    this.popularTime = `${formattedHour} ${period}`;
    console.log('✅ Visitor Dashboard: Most popular viewing time set to:', this.popularTime);
  }

  processData(viewingTimes: any[]): void {
    const groupedData: { [key: string]: { total: number; count: number }[] } = {};

    // Initialize groupedData for each day
    for (let i = 0; i < 7; i++) {
      groupedData[i] = Array(24).fill(null).map(() => ({ total: 0, count: 0 }));
    }

    // Group data by day and hour
    viewingTimes.forEach((menu) => {
      if (menu.viewingTime) {
        menu.viewingTime.forEach((view: { day: number; hour: number; time: number }) => {
          groupedData[view.day][view.hour].total += view.time;
          groupedData[view.day][view.hour].count++;
        });
      }
    });

    // Calculate averages
    for (const day in groupedData) {
      this.dayData[day] = groupedData[day].map((entry, hour) => ({
        hour,
        viewCount: entry.count,
      }));
    }
  }

  setChartOptions(): void {
    // Get CSS variables for colors and computed values for ECharts compatibility
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const primaryColor = computedStyle.getPropertyValue('--hungr-main-color').trim() || '#FE1B54';
    const secondaryColor = computedStyle.getPropertyValue('--hungr-secondary-color').trim() || '#16D3D2';
    const textSecondary = computedStyle.getPropertyValue('--color-text-secondary').trim() || '#444444';
    const fontFamily = computedStyle.getPropertyValue('--font-family-primary').trim() || 'Poppins, sans-serif';

    this.options = {
      color: [primaryColor], // Use primary color for the bars
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0].data;
          const viewCount = data.value || 0;
          const hour = data.hour || params[0].dataIndex || 0;

          return `${this.daysOfWeek[this.activeDay]} ${hour}:00<br>View Count: ${viewCount}`;
        },
      },
      xAxis: {
        type: 'category',
        data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        name: 'Time of Day',
        nameLocation: 'middle',
        nameGap: 30,
        axisLine: {
          lineStyle: {
            color: primaryColor,
          }
        },
        axisLabel: {
          color: textSecondary,
          fontFamily: fontFamily,
        }
      },
      yAxis: {
        type: 'value',
        name: 'View Count',
        nameLocation: 'middle',
        nameRotate: 90,
        nameGap: 50,
        axisLine: {
          lineStyle: {
            color: primaryColor,
          }
        },
        axisLabel: {
          color: textSecondary,
          fontFamily: fontFamily,
        }
      },
      series: [
        {
          type: 'bar',
          data: this.dayData[this.activeDay]?.map((entry) => ({
            value: entry.viewCount,
            hour: entry.hour,
          })),
          itemStyle: {
            color: primaryColor,
            borderRadius: [2, 2, 0, 0], // Rounded top corners
          },
          emphasis: {
            itemStyle: {
              color: secondaryColor,
            }
          }
        },
      ],
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      }
    };
  }

  onTabChange(day: number): void {
    this.activeDay = day;
    this.setChartOptions();
  }

  generateSampleData(): void {
    console.log('Generating sample data...');
    this.dayData = {};
    for (let i = 0; i < 7; i++) {
      const sampleData = Array(24).fill(null).map((_, hour) => ({
        hour,
        viewCount: Math.floor(Math.random() * 10) + 1, // Random view count between 1 and 10
      }));
      this.dayData[i] = sampleData;
    }
    this.averageTime = 5; // Example average time
    this.popularTime = '10 AM'; // Example popular time
    this.setChartOptions();
  }
}

