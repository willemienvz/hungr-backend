import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  list: any[] = [
    { id: 1, name: 'Restaurant Name', description: 'Mains' },
    { id: 2, name: 'Restaurant Name', description: 'Drinks' },
    { id: 3, name: 'Restaurant Name', description: 'Mains' }
  ];

  listInsights: any[] = [
    { id: 1, name: 'Most Viewed Category', description: 'Drinks' },
    { id: 2, name: 'Most Ordered Category', description: 'Mains' },
    { id: 3, name: 'Least Ordered Category', description: 'Sides' }
  ];

  listMost: any[] = [
    { id: 1, name: 'Americano', description: '2100 orders' },
    { id: 2, name: 'Cuppaccino', description: '1920 orders' },
    { id: 3, name: 'Beef & Cheese Burger', description: '1669 orders' }
  ];

  listAdditional: any[] = [
    { id: 1, name: 'Order Value', description: '+23%' },
    { id: 2, name: 'Staff Tips', description: '+13%' },
    { id: 3, name: 'Drinks Sales', description: '-1%' }
  ];
  constructor(public authService: AuthService) {}
  ngOnInit(): void {}
 
}