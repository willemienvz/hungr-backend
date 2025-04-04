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
   userDataID: string = '';
    menus$: Observable<any[]> | undefined;
    restaurant$: Observable<any[]> | undefined;
    averageTime:number = 0;
    popularTime: string = '';

    options: any; // Chart options for ECharts
  activeDay: number = 0; // Active tab index (0 = Sunday)
  daysOfWeek = [ 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  dayData: { [key: string]: { hour: number; avgTime: number }[] } = {};

  accountType = localStorage.getItem('accountType');
  layoutMinimised: boolean = false;
    
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
      } else {
        console.log("No authenticated user");
        this.router.navigate(['/signin']);
      }
    });
  }


  fetchMenus() {
    this.menus$ = this.firestore
      .collection('menus', (ref) => ref.where('OwnerID', '==', this.userDataID))
      .snapshotChanges();

    this.menus$.subscribe({
      next: (menus) => {
        const menuData = menus.map((menu) => menu.payload.doc.data());
        this.calculateAverageViewingTime(menuData);
        this.getMostPopularViewingTime(menuData);
        this.processData(menuData); 
        this.setChartOptions();
        console.log(menuData);
        
      },
      error: (error) => console.error("Error fetching menus:", error),
    });
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
      avgTime: entry.count > 0 ? entry.total / entry.count : 0,
    }));
  }
}

setChartOptions(): void {
  this.options = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0].data;
        return `${this.daysOfWeek[this.activeDay]} ${data.hour}:00<br>Average Viewing Time: ${(
          data.avgTime / 1000
        ).toFixed(2)} seconds`;
      },
    },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      name: 'Time of Day',
      nameLocation: 'middle', // Places the label in the middle of the axis
      nameGap: 30,
    },
    yAxis: {
      type: 'value',
      name: 'Average Viewing Time (ms)',
      nameLocation: 'middle', // Places the label in the middle of the axis
      nameRotate: 90, // Rotates the label to be vertical
      nameGap: 50,
    },
    series: [
      {
        type: 'bar',
        data: this.dayData[this.activeDay]?.map((entry) => ({
          value: entry.avgTime,
          hour: entry.hour,
        })),
      },
    ],
  };
}

onTabChange(day: number): void {
  this.activeDay = day;
  this.setChartOptions();
}
}

