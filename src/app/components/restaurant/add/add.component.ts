import { Component, OnInit } from '@angular/core';
import { Menu } from '../../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from '../../../shared/services/user';
import { ConfigService } from '../../../config.service';
import { Restaurant } from '../../../shared/services/restaurant';
import { MatDialog } from '@angular/material/dialog';
import { SuccessAddRestaurantDialogComponent } from './success-add-restaurant-dialog/success-add-restaurant-dialog.component';
import { SaveProgressDialogComponent } from '../../save-progress-dialog/save-progress-dialog.component';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrl: './add.component.scss',
})
export class AddComponent implements OnInit {
  selectedMenu: Menu | undefined;
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
  selectedUserSurname: string = '';
  selectedUserName: string = '';
  isSaving: boolean = false;
  userChanged: boolean = false;
  hasUnsavedChanges: boolean = false;
  constructor(
    private firestore: AngularFirestore,
    private configService: ConfigService,
    private dialog: MatDialog,
    private router: Router,
    private readonly toastr: ToastrService
  ) {
    for (let i = 1; i <= this.configService.numberOfTables; i++) {
      this.tableNums.push(i);
    }
  }
  ngOnInit() {
    this.selectedUser = null;
    this.user = JSON.parse(localStorage.getItem('user')!);
    this.OwnerID = this.user.uid;
    this.fetchMenus();
    this.fetchUsers();
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

  private fetchUsers() {
    this.firestore
      .collection<User>('users', (ref) =>
        ref.where('parentId', 'in', [this.OwnerID, ''])
      )
      .valueChanges()
      .subscribe((users) => {
        this.users = users;
      });

    this.firestore
      .collection<User>('users', (ref) => ref.where('uid', '==', this.OwnerID))
      .valueChanges()
      .subscribe((users) => {
        this.currentUser = users[0];
      });
  }

  selectMenu(menu: Menu) {
    this.selectedMenu = menu;
    this.markAsChanged();
  }

  async onAddUserClick(event: Event) {
    event.preventDefault();

    const dialogRef = this.dialog.open(SaveProgressDialogComponent);

    const result = await dialogRef.afterClosed().toPromise();

    if (result) {
      try {
        await this.addRestaurant(); // ✅ Wait for the save to complete
        this.router.navigate(['/manage-users']);
      } catch (err) {
        // Do not navigate if save failed
      }
    }
  }

  async onAddMenuClick(event: Event) {
    event.preventDefault();

    const dialogRef = this.dialog.open(SaveProgressDialogComponent);

    const result = await dialogRef.afterClosed().toPromise();

    if (result) {
      try {
        await this.addRestaurant(); // Save restaurant first
        this.router.navigate(['/menus/add-menu', 1]); // Then navigate
      } catch (err) {
        // Do nothing on failure
      }
    }
  }

  saveDraft() {
    const menuID = this.selectedMenu ? this.selectedMenu.menuID : '';
    let holdID = this.userChanged ? this.selectedUser.uid : '';

    this.newRestaurant = {
      ...this.newRestaurant,
      city: this.restaurant.city || '',
      mainContactID: holdID,
      menuID: menuID,
      numberTables: this.selectedNumberTable || '',
      ownerID: this.currentUser?.uid || '',
      province: this.restaurant.province || '',
      restaurantName: this.restaurant.name || '',
      status: this.restaurantStatus ?? true,
      streetAdress: this.restaurant.street || '',
      zip: this.restaurant.zip || '',
    };

    const restaurantCollection = this.firestore.collection('restuarants');

    const handleSuccess = () => {
      this.dialog.open(SuccessAddRestaurantDialogComponent, {
        width: '400px',
        data: {
          message: 'Your new restaurant has been successfully created.',
          title: 'Restaurant Added',
        },
      });
    };

    if (this.newRestaurant.restaurantID) {
      restaurantCollection
        .doc(this.newRestaurant.restaurantID)
        .update(this.newRestaurant)
        .then(handleSuccess)
        .catch((error) => {
          this.toastr.error('An error occurred while updating the restaurant.');
          console.error('Error updating restaurant: ', error);
        });
    } else {
      restaurantCollection
        .add(this.newRestaurant)
        .then((docRef) => {
          this.newRestaurant.restaurantID = docRef.id;
          return docRef.update({
            ...this.newRestaurant,
            restaurantID: docRef.id,
          });
        })
        .then(handleSuccess)
        .catch((error) => {
          this.toastr.error('An error occurred while saving the restaurant.');
          console.error('Error adding restaurant: ', error);
        });
    }
  }

  addRestaurant(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (
        !this.restaurant.name ||
        !this.restaurant.city ||
        !this.restaurant.street ||
        !this.restaurant.province ||
        !this.restaurant.zip
      ) {
        this.toastr.error('Please complete all required fields before saving.');
        reject();
        return;
      }

      const menuID = this.selectedMenu ? this.selectedMenu.menuID : '';
      let holdID = this.userChanged ? this.selectedUser.uid : '';

      this.newRestaurant = {
        restaurantID: '1',
        city: this.restaurant.city || '',
        mainContactID: holdID,
        menuID: menuID,
        numberTables: this.selectedNumberTable || '',
        ownerID: this.currentUser?.uid || '',
        province: this.restaurant.province || '',
        restaurantName: this.restaurant.name || '',
        status: this.restaurantStatus ?? true,
        streetAdress: this.restaurant.street || '',
        zip: this.restaurant.zip || '',
      };

      this.firestore
        .collection('restuarants')
        .add(this.newRestaurant)
        .then((data) => {
          this.newRestaurant.restaurantID = data.id;
          return this.firestore
            .collection('restuarants')
            .doc(data.id)
            .update(this.newRestaurant);
        })
        .then(() => {
          this.dialog.open(SuccessAddRestaurantDialogComponent, {
            width: '400px',
            data: {
              message: 'Your new restaurant has been successfully created.',
              title: 'Restaurant Added',
            },
          });
          resolve();
        })
        .catch((error) => {
          this.toastr.error('An error occurred while saving the restaurant.');
          console.error('Error adding restaurant: ', error);
          reject(error);
        });
    });
  }

  selectUser(user: User) {
    this.selectedUser = user;
    console.log(this.selectedUser);
    this.selectedUserName = user.firstName;
    this.selectedUserSurname = user.Surname;
    this.userChanged = true;
    this.markAsChanged();
  }

  removeUser() {
    this.selectedUser = null;
    this.selectedUserName = '';
    this.selectedUserSurname = '';
    this.userChanged = true;
    this.markAsChanged();
  }
}
