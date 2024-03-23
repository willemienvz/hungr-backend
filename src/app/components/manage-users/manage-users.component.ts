import { Component } from '@angular/core';

interface User {
  name: string;
  email: string;
  status: boolean;
  role: 'admin' | 'editor'; // Define role property type
}

@Component({
  selector: 'app-manage-users',
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.scss']
})
export class ManageUsersComponent {
  users: User[] = [
    { name: 'John Doe', email: 'john@example.com', status: true, role: 'admin' },
    { name: 'Jane Smith', email: 'jane@example.com', status: false, role: 'admin' },
    { name: 'Alice Johnson', email: 'alice@example.com', status: true, role: 'editor' },
    { name: 'Bob Johnson', email: 'bob@example.com', status: true, role: 'editor' },
  ];

  filteredAdmins: User[] = [];
  filteredEditors: User[] = [];
  isPopupMenuOpen: boolean[] = [];

  constructor() {
    this.filterUsers();
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  private filterUsers() {
    this.filteredAdmins = this.users.filter(user => user.role === 'admin');
    this.filteredEditors = this.users.filter(user => user.role === 'editor');
  }
}
