import { Component } from '@angular/core';
import { Menu } from '../../../shared/services/menu';
import { Restaurant } from '../../../shared/services/restaurant';
import { User } from '../../../shared/services/user';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ConfigService } from '../../../config.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SuccessAddRestaurantDialogComponent } from '../add/success-add-restaurant-dialog/success-add-restaurant-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';

@Component({
  selector: 'app-edit-restaurant',
  templateUrl: './edit-restaurant.component.html',
  styleUrl: './edit-restaurant.component.scss',
})
export class EditRestaurantComponent {
  selectedMenu: string = '';
  selectedMenuID: string = '';
  newRestaurant: Restaurant = {} as Restaurant;
  restaurant: any = {};
  menus: Menu[] = [];
  users: User[] = [];
  currentUser: User = {} as User;
  selectedContact: string = 'selected';
  selectedUser: User = {} as User;
  selectedNumberTable: string = '';
  restaurantStatus: boolean = false;
  user: any;
  OwnerID: string = '';
  tableNums: number[] = [];
  currentRestaurantID: string = '';
  currentRestaurant: Restaurant = {} as Restaurant;
  selectedUserSurname: string = '';
  selectedUserName: string = '';
  isSaving: boolean = false;
  userChanged: boolean = false;
  hasUnsavedChanges: boolean = false;

  saProvinces: string[] = [
    'Eastern Cape',
    'Free State',
    'Gauteng',
    'KwaZulu-Natal',
    'Limpopo',
    'Mpumalanga',
    'North West',
    'Northern Cape',
    'Western Cape',
  ];

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('user')!);
    this.OwnerID = this.user.uid;
    this.route.queryParams.subscribe((params) => {
      this.currentRestaurantID = params['id'];
    });
    this.fetchMenus();
    this.fetchUsers();
    this.fetchRestaurant(this.currentRestaurantID);
    this.setupFormTracking();
  }

  private setupFormTracking() {
    // Track changes to detect unsaved modifications
    const inputs = ['name', 'street', 'city', 'province', 'zip'];
    inputs.forEach(input => {
      const originalValue = this.restaurant[input];
      Object.defineProperty(this.restaurant, `_${input}`, { value: originalValue, writable: true });
      Object.defineProperty(this.restaurant, input, {
        get: () => this.restaurant[`_${input}`],
        set: (value) => {
          this.restaurant[`_${input}`] = value;
          this.markAsChanged();
        },
        enumerable: true,
        configurable: true
      });
    });
  }

  private markAsChanged() {
    this.hasUnsavedChanges = true;
  }

  private markAsSaved() {
    this.hasUnsavedChanges = false;
  }

  async navigateWithUnsavedChangesCheck(route: string | any[]) {
    if (this.hasUnsavedChanges) {
      const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
        width: '400px',
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result === true) {
          if (Array.isArray(route)) {
            this.router.navigate(route);
          } else {
            this.router.navigate([route]);
          }
        }
      });
    } else {
      if (Array.isArray(route)) {
        this.router.navigate(route);
      } else {
        this.router.navigate([route]);
      }
    }
  }

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private firestore: AngularFirestore,
    private configService: ConfigService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    for (let i = 1; i <= this.configService.numberOfTables; i++) {
      this.tableNums.push(i);
    }
  }

  private fetchMenus() {
    this.firestore
      .collection<Menu>('menus', (ref) =>
        ref.where('OwnerID', '==', this.OwnerID)
      )
      .valueChanges()
      .subscribe((menus) => {
        this.menus = menus;
      });
  }
  private fetchUser(id: string) {
    this.firestore
      .collection<User>('users', (ref) => ref.where('uid', '==', id))
      .valueChanges()
      .subscribe((users) => {
        this.selectedUserName = users[0].firstName;
        this.selectedUserSurname = users[0].Surname;
      });
  }

  private fetchUsers() {
    this.firestore
      .collection<User>('users', (ref) =>
        ref.where('parentId', 'in', [this.OwnerID, ''])
      )
      .valueChanges()
      .subscribe((users) => {
        console.log('w', users);
        this.users = users;
      });

    this.firestore
      .collection<User>('users', (ref) => ref.where('uid', '==', this.OwnerID))
      .valueChanges()
      .subscribe((users) => {
        this.currentUser = users[0];
      });
  }

  private fetchRestaurant(id: string) {
    this.firestore
      .collection<Restaurant>('restuarants', (ref) =>
        ref.where('restaurantID', '==', this.currentRestaurantID)
      )
      .valueChanges()
      .subscribe((restaurant) => {
        this.currentRestaurant = restaurant[0];
        this.restaurant.city = this.currentRestaurant.city;
        this.selectedNumberTable = this.currentRestaurant.numberTables;
        this.restaurant.province = this.currentRestaurant.province;
        this.restaurant.name = this.currentRestaurant.restaurantName;
        this.restaurantStatus = this.currentRestaurant.status;
        this.restaurant.street = this.currentRestaurant.streetAdress;
        this.restaurant.zip = this.currentRestaurant.zip;
        this.selectedMenu = this.currentRestaurant.menuID;
        this.fetchUser(this.currentRestaurant.mainContactID);
      });
  }

  editRestaurant() {
    this.isSaving = false;
    const menuID = this.selectedMenu ? this.selectedMenu : '';
    var holdID = '';

    if (this.userChanged) {
      holdID = this.selectedUser.uid;
    } else {
      holdID = this.currentRestaurant.mainContactID;
    }

    var tempRestaurant = {
      city: this.restaurant.city,
      mainContactID: holdID,
      menuID: menuID,
      numberTables: this.selectedNumberTable,
      ownerID: this.currentUser.uid,
      province: this.restaurant.province,
      restaurantName: this.restaurant.name,
      status: this.restaurantStatus,
      streetAdress: this.restaurant.street,
      zip: this.restaurant.zip,
    };

    console.log(tempRestaurant);
    this.firestore
      .collection('restuarants')
      .doc(this.currentRestaurantID)
      .update(tempRestaurant)
      .then(() => {
        this.dialog.open(SuccessAddRestaurantDialogComponent, {
          width: '400px',
          data: {
            message: 'Your restaurant has been updated.',
            title: 'Restaurant Edited',
          },
        });
      })
      .catch((error) => {
        console.error('Error updating restaurant:', error);
        this.snackBar.open(
          'Failed to update restaurant. Please try again.',
          'Close',
          {
            duration: 3000,
          }
        );
      });
  }

  saveDraft() {
    this.isSaving = false;
    const menuID = this.selectedMenu ? this.selectedMenu : '';
    var holdID = '';

    if (this.userChanged) {
      holdID = this.selectedUser.uid;
    } else {
      holdID = this.currentRestaurant.mainContactID;
    }

    var tempRestaurant = {
      city: this.restaurant.city,
      mainContactID: holdID,
      menuID: menuID,
      numberTables: this.selectedNumberTable,
      ownerID: this.currentUser.uid,
      province: this.restaurant.province,
      restaurantName: this.restaurant.name,
      status: false,
      streetAdress: this.restaurant.street,
      zip: this.restaurant.zip,
    };

    console.log(tempRestaurant);
    this.firestore
      .collection('restuarants')
      .doc(this.currentRestaurantID)
      .update(tempRestaurant)
      .then(() => {
        this.dialog.open(SuccessAddRestaurantDialogComponent, {
          width: '400px',
          data: {
            message: 'Your restaurant has been updated.',
            title: 'Restaurant Edited',
          },
        });
      })
      .catch((error) => {
        console.error('Error updating restaurant:', error);
        this.snackBar.open(
          'Failed to update restaurant. Please try again.',
          'Close',
          {
            duration: 3000,
          }
        );
      });
  }

  selectMenu(menuID: string) {
    this.selectedMenuID = menuID;
    this.markAsChanged();
  }

  selectUser(user: User) {
    this.selectedUser = user;
    console.log(this.selectedUser);
    this.selectedUserName = user.firstName;
    this.selectedUserSurname = user.Surname;
    this.userChanged = true;
  }

  removeUser() {
    this.selectedUser = null;
    this.selectedUserName = '';
    this.selectedUserSurname = '';
    this.userChanged = true;
  }
}
