import { Component, OnInit, Input } from '@angular/core';
import { Menu } from '../../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from '../../../shared/services/user';
import { ConfigService } from '../../../config.service';
import { Restaurant } from '../../../shared/services/restaurant';
import { MatDialog } from '@angular/material/dialog';
import { SuccessAddRestaurantDialogComponent } from '../add/success-add-restaurant-dialog/success-add-restaurant-dialog.component';
import { SaveProgressDialogComponent } from '../../save-progress-dialog/save-progress-dialog.component';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-restaurant-form',
  templateUrl: './restaurant-form.component.html',
  styleUrl: './restaurant-form.component.scss',
})
export class RestaurantFormComponent implements OnInit {
  mode: 'add' | 'edit' = 'add';
  
  selectedMenu: Menu | string | undefined;
  newRestaurant: Restaurant = {} as Restaurant;
  restaurant: any = {};
  menus: Menu[] = [];
  users: User[] = [];
  assignedUsers: User[] = []; // Only users assigned to this restaurant
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

  constructor(
    private firestore: AngularFirestore,
    private configService: ConfigService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private readonly toastr: ToastrService,
    private snackBar: MatSnackBar
  ) {
    for (let i = 1; i <= this.configService.numberOfTables; i++) {
      this.tableNums.push(i);
    }
  }

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('user')!);
    this.OwnerID = this.user.uid;
    
    // Get mode from route data or determine from URL
    this.route.data.subscribe((data) => {
      this.mode = data['mode'] || 'add';
    });
    
    // Also check URL to determine mode if no route data
    if (!this.route.snapshot.data['mode']) {
      if (this.route.snapshot.url.some(segment => segment.path === 'edit-restaurant')) {
        this.mode = 'edit';
      } else {
        this.mode = 'add';
      }
    }
    
    if (this.mode === 'edit') {
      this.route.params.subscribe((params) => {
        this.currentRestaurantID = params['restaurantID'];
        if (this.currentRestaurantID) {
          this.fetchRestaurant(this.currentRestaurantID);
        }
      });
    }
    
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
    // Fetch only team members (users with parentId == OwnerID) and the current owner
    this.firestore
      .collection<User>('users', (ref) =>
        ref.where('parentId', '==', this.OwnerID)
      )
      .valueChanges()
      .subscribe((teamUsers) => {
        // Also fetch the current owner user
        this.firestore
          .collection<User>('users', (ref) => ref.where('uid', '==', this.OwnerID))
          .valueChanges()
          .subscribe((ownerUsers) => {
            const currentUser = ownerUsers[0];
            this.currentUser = currentUser;
            
            // Combine team users with current owner (if not already included)
            let allAvailableUsers = [...teamUsers];
            if (currentUser && !teamUsers.some(u => u.uid === currentUser.uid)) {
              allAvailableUsers.push(currentUser);
            }
            
            // Filter users based on restaurant assignment
            this.filterAvailableUsers(allAvailableUsers);
            
            // Debug logging
            console.log('Total team users found:', allAvailableUsers.length);
            console.log('Filtered users for dropdown:', this.users.length);
            console.log('Users in dropdown:', this.users.map(u => `${u.firstName} ${u.Surname} (${u.parentId === this.OwnerID ? 'Team Member' : 'Owner'})`));
          });
      });
  }

  private filterAvailableUsers(allUsers: User[]) {
    if (this.mode === 'add') {
      // For new restaurants, show team members that are not assigned to any restaurant
      // or are assigned to fewer than 2 restaurants (allowing some flexibility)
      this.users = allUsers.filter(user => {
        // Only show team members (users with parentId == OwnerID) and the current owner
        if (user.parentId !== this.OwnerID && user.uid !== this.OwnerID) {
          return false;
        }
        
        if (!user.assignedRestaurants || user.assignedRestaurants.length === 0) {
          return true; // User not assigned to any restaurant
        }
        return user.assignedRestaurants.length < 2; // Allow users to be assigned to up to 2 restaurants
      });
    } else {
      // For editing, show team members that are either:
      // 1. Currently assigned to this restaurant
      // 2. Not assigned to any restaurant
      // 3. Assigned to fewer than 2 restaurants
      this.users = allUsers.filter(user => {
        // Only show team members (users with parentId == OwnerID) and the current owner
        if (user.parentId !== this.OwnerID && user.uid !== this.OwnerID) {
          return false;
        }
        
        if (!user.assignedRestaurants || user.assignedRestaurants.length === 0) {
          return true; // User not assigned to any restaurant
        }
        if (user.assignedRestaurants.includes(this.currentRestaurantID)) {
          return true; // User is currently assigned to this restaurant
        }
        return user.assignedRestaurants.length < 2; // Allow users to be assigned to up to 2 restaurants
      });
    }
  }

  private fetchAssignedUsers(restaurantId: string) {
    // Fetch users that are currently assigned to this restaurant
    if (restaurantId) {
      this.firestore
        .collection<User>('users', (ref) =>
          ref.where('assignedRestaurants', 'array-contains', restaurantId)
        )
        .valueChanges()
        .subscribe((users) => {
          this.assignedUsers = users;
        });
    } else {
      this.assignedUsers = [];
    }
  }

  private fetchRestaurant(id: string) {
    this.firestore
      .collection<Restaurant>('restuarants', (ref) =>
        ref.where('restaurantID', '==', id)
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
        
        if (this.currentRestaurant.mainContactID) {
          this.fetchUser(this.currentRestaurant.mainContactID);
        }
        
        // Fetch assigned users for this restaurant
        this.fetchAssignedUsers(id);
      });
  }

  private fetchUser(id: string) {
    this.firestore
      .collection<User>('users', (ref) => ref.where('uid', '==', id))
      .valueChanges()
      .subscribe((users) => {
        if (users.length > 0) {
          this.selectedUserName = users[0].firstName;
          this.selectedUserSurname = users[0].Surname;
        }
      });
  }

  selectMenu(menu: Menu | string) {
    this.selectedMenu = menu;
    this.markAsChanged();
  }

  async onAddUserClick(event: Event) {
    event.preventDefault();

    const dialogRef = this.dialog.open(SaveProgressDialogComponent);

    const result = await dialogRef.afterClosed().toPromise();

    if (result) {
      try {
        if (this.mode === 'add') {
          await this.addRestaurant();
        } else {
          await this.editRestaurant();
        }
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
        if (this.mode === 'add') {
          await this.addRestaurant();
        } else {
          await this.editRestaurant();
        }
        this.router.navigate(['/menus/add-menu', 1]);
      } catch (err) {
        // Do nothing on failure
      }
    }
  }

  saveDraft() {
    if (this.mode === 'add') {
      this.addRestaurantDraft();
    } else {
      this.editRestaurantDraft();
    }
  }

  private addRestaurantDraft() {
    const menuID = this.selectedMenu ? (typeof this.selectedMenu === 'string' ? this.selectedMenu : this.selectedMenu.menuID) : '';
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
      status: false, // Draft is always inactive
      streetAdress: this.restaurant.street || '',
      zip: this.restaurant.zip || '',
      assignedUsers: holdID ? [holdID] : [],
    };

    const restaurantCollection = this.firestore.collection('restuarants');

    const handleSuccess = () => {
      this.dialog.open(SuccessAddRestaurantDialogComponent, {
        width: '400px',
        data: {
          message: 'Your new restaurant has been successfully created as a draft.',
          title: 'Restaurant Draft Saved',
        },
      });
      this.markAsSaved();
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

  private editRestaurantDraft() {
    this.isSaving = false;
    const menuID = this.selectedMenu ? (typeof this.selectedMenu === 'string' ? this.selectedMenu : this.selectedMenu.menuID) : '';
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
      status: false, // Draft is always inactive
      streetAdress: this.restaurant.street,
      zip: this.restaurant.zip,
      assignedUsers: holdID ? [holdID] : [],
    };

    this.firestore
      .collection('restuarants')
      .doc(this.currentRestaurantID)
      .update(tempRestaurant)
      .then(() => {
        this.dialog.open(SuccessAddRestaurantDialogComponent, {
          width: '400px',
          data: {
            message: 'Your restaurant has been updated as a draft.',
            title: 'Restaurant Draft Saved',
          },
        });
        this.markAsSaved();
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

      const menuID = this.selectedMenu ? (typeof this.selectedMenu === 'string' ? this.selectedMenu : this.selectedMenu.menuID) : '';
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
        assignedUsers: holdID ? [holdID] : [],
      };

      this.firestore
        .collection('restuarants')
        .add(this.newRestaurant)
        .then((docRef) => {
          this.newRestaurant.restaurantID = docRef.id;
          return this.firestore
            .collection('restuarants')
            .doc(docRef.id)
            .update(this.newRestaurant);
        })
        .then(() => {
          // Update user's assignedRestaurants array
          if (holdID) {
            this.updateUserRestaurantAssignment(holdID, this.newRestaurant.restaurantID, true);
          }
          this.dialog.open(SuccessAddRestaurantDialogComponent, {
            width: '400px',
            data: {
              message: 'Your new restaurant has been successfully created.',
              title: 'Restaurant Added',
            },
          });
          this.markAsSaved();
          resolve();
        })
        .catch((error) => {
          this.toastr.error('An error occurred while saving the restaurant.');
          console.error('Error adding restaurant: ', error);
          reject(error);
        });
    });
  }

  editRestaurant() {
    this.isSaving = false;
    const menuID = this.selectedMenu ? (typeof this.selectedMenu === 'string' ? this.selectedMenu : this.selectedMenu.menuID) : '';
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
      assignedUsers: holdID ? [holdID] : [],
    };

    this.firestore
      .collection('restuarants')
      .doc(this.currentRestaurantID)
      .update(tempRestaurant)
      .then(() => {
        // Update user restaurant assignments if user changed
        if (this.userChanged) {
          // Remove old user from restaurant assignment
          if (this.currentRestaurant.mainContactID) {
            this.updateUserRestaurantAssignment(this.currentRestaurant.mainContactID, this.currentRestaurantID, false);
          }
          // Add new user to restaurant assignment
          if (holdID) {
            this.updateUserRestaurantAssignment(holdID, this.currentRestaurantID, true);
          }
        }
        
        this.dialog.open(SuccessAddRestaurantDialogComponent, {
          width: '400px',
          data: {
            message: 'Your restaurant has been updated.',
            title: 'Restaurant Edited',
          },
        });
        this.markAsSaved();
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

  selectUser(user: User) {
    // If we're editing and changing from one user to another, update restaurant assignments
    if (this.mode === 'edit' && this.currentRestaurant.mainContactID && this.currentRestaurant.mainContactID !== user.uid) {
      // Remove old user from restaurant assignment
      this.updateUserRestaurantAssignment(this.currentRestaurant.mainContactID, this.currentRestaurantID, false);
    }
    
    this.selectedUser = user;
    this.selectedUserName = user.firstName;
    this.selectedUserSurname = user.Surname;
    this.userChanged = true;
    this.markAsChanged();
  }

  removeUser() {
    // If we're editing and removing a user, update their restaurant assignment
    if (this.mode === 'edit' && this.currentRestaurant.mainContactID) {
      this.updateUserRestaurantAssignment(this.currentRestaurant.mainContactID, this.currentRestaurantID, false);
    }
    
    this.selectedUser = null;
    this.selectedUserName = '';
    this.selectedUserSurname = '';
    this.userChanged = true;
    this.markAsChanged();
  }

  onSubmit() {
    if (this.mode === 'add') {
      this.addRestaurant();
    } else {
      this.editRestaurant();
    }
  }

  private updateUserRestaurantAssignment(userId: string, restaurantId: string, add: boolean) {
    // Get the user document
    this.firestore
      .collection('users')
      .doc(userId)
      .get()
      .subscribe((userDoc) => {
        if (userDoc.exists) {
          const userData = userDoc.data() as User;
          let assignedRestaurants = userData.assignedRestaurants || [];
          
          if (add) {
            // Add restaurant to user's assigned restaurants
            if (!assignedRestaurants.includes(restaurantId)) {
              assignedRestaurants.push(restaurantId);
            }
          } else {
            // Remove restaurant from user's assigned restaurants
            assignedRestaurants = assignedRestaurants.filter(id => id !== restaurantId);
          }
          
          // Update the user document
          this.firestore
            .collection('users')
            .doc(userId)
            .update({ assignedRestaurants })
            .catch((error) => {
              console.error('Error updating user restaurant assignment:', error);
            });
        }
      });
  }
}
