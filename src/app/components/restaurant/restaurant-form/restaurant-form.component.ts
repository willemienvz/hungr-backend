import { Component, OnInit, Input } from '@angular/core';
import { Menu } from '../../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from '../../../shared/services/user';
import { ConfigService } from '../../../config.service';
import { Restaurant } from '../../../shared/services/restaurant';
import { MatDialog } from '@angular/material/dialog';
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
  currentUser: User = {} as User;
  selectedNumberTable: string = '';
  restaurantStatus: boolean = false;
  user: any;
  OwnerID: string = '';
  tableNums: number[] = [];
  currentRestaurantID: string = '';
  currentRestaurant: Restaurant = {} as Restaurant;
  isSaving: boolean = false;
  hasUnsavedChanges: boolean = false;
  isDuplicateName: boolean = false;
  originalRestaurantName: string = '';
  duplicateCheckTimeout: any;

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
    this.fetchCurrentUser();
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

  private fetchCurrentUser() {
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
        
        // Store original restaurant name for duplicate checking
        this.originalRestaurantName = this.currentRestaurant.restaurantName;
        
        // Fix: Find the menu object that matches the menuID
        const menuID = this.currentRestaurant.menuID;
        this.selectedMenu = this.menus.find(menu => menu.menuID === menuID) || menuID;
      });
  }


  selectMenu(menu: Menu | string) {
    this.selectedMenu = menu;
    this.markAsChanged();
  }

  onNumberTableInput(event: any) {
    // Remove any non-numeric characters
    const value = event.target.value.replace(/[^0-9]/g, '');
    this.selectedNumberTable = value;
    this.markAsChanged();
  }

  checkDuplicateName(restaurantName: string): void {
    if (!restaurantName || !restaurantName.trim()) {
      this.isDuplicateName = false;
      return;
    }

    // Don't check if it's the same as the original name (for edit mode)
    if (this.mode === 'edit' && restaurantName.trim().toLowerCase() === this.originalRestaurantName.toLowerCase()) {
      this.isDuplicateName = false;
      return;
    }

    // Clear previous timeout
    if (this.duplicateCheckTimeout) {
      clearTimeout(this.duplicateCheckTimeout);
    }

    // Debounce the check to avoid too many queries
    this.duplicateCheckTimeout = setTimeout(() => {
      this.firestore
        .collection<Restaurant>('restuarants', (ref) =>
          ref
            .where('ownerID', '==', this.currentUser?.uid)
            .where('restaurantName', '==', restaurantName.trim())
        )
        .get()
        .subscribe((querySnapshot) => {
          this.isDuplicateName = !querySnapshot.empty;
        });
    }, 500);
  }

  onRestaurantNameChange(name: string): void {
    this.restaurant.name = name;
    this.checkDuplicateName(name);
    this.markAsChanged();
  }


  async onAddMenuClick(event: Event) {
    event.preventDefault();

    const dialogRef = this.dialog.open(SaveProgressDialogComponent, {
      width: '400px',
      disableClose: true
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result) {
      try {
        if (this.isFormValid()) {
          if (this.mode === 'add') {
            await this.addRestaurant();
          } else {
            await this.editRestaurant();
          }
        } else {
          // Save as draft if form is not fully validated
          this.saveDraft();
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

    this.newRestaurant = {
      ...this.newRestaurant,
      city: this.restaurant.city || '',
      mainContactID: this.currentUser?.uid || '', // Auto-assign current user
      menuID: menuID,
      numberTables: this.selectedNumberTable || '',
      ownerID: this.currentUser?.uid || '',
      province: this.restaurant.province || '',
      restaurantName: this.restaurant.name || '',
      status: false, // Draft is always inactive
      streetAdress: this.restaurant.street || '',
      zip: this.restaurant.zip || '',
      assignedUsers: [this.currentUser?.uid || ''], // Auto-assign current user
    };

    const restaurantCollection = this.firestore.collection('restuarants');

    const handleSuccess = () => {
      this.toastr.success('Your new restaurant has been successfully created as a draft.');
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

    var tempRestaurant = {
      city: this.restaurant.city,
      mainContactID: this.currentRestaurant.mainContactID, // Keep existing main contact
      menuID: menuID,
      numberTables: this.selectedNumberTable,
      ownerID: this.currentUser.uid,
      province: this.restaurant.province,
      restaurantName: this.restaurant.name,
      status: false, // Draft is always inactive
      streetAdress: this.restaurant.street,
      zip: this.restaurant.zip,
      assignedUsers: this.currentRestaurant.assignedUsers || [], // Keep existing assigned users
    };

    this.firestore
      .collection('restuarants')
      .doc(this.currentRestaurantID)
      .update(tempRestaurant)
      .then(() => {
        this.toastr.success('Your restaurant has been updated as a draft.');
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

      // Add duplicate name check
      if (this.isDuplicateName) {
        this.toastr.error('A restaurant with this name already exists. Please choose a different name.');
        reject();
        return;
      }

      const menuID = this.selectedMenu ? (typeof this.selectedMenu === 'string' ? this.selectedMenu : this.selectedMenu.menuID) : '';

      this.newRestaurant = {
        restaurantID: '1',
        city: this.restaurant.city || '',
        mainContactID: this.currentUser?.uid || '', // Auto-assign current user
        menuID: menuID,
        numberTables: this.selectedNumberTable || '',
        ownerID: this.currentUser?.uid || '', // Current user is owner
        province: this.restaurant.province || '',
        restaurantName: this.restaurant.name || '',
        status: true, // Always active for new restaurants
        streetAdress: this.restaurant.street || '',
        zip: this.restaurant.zip || '',
        assignedUsers: [this.currentUser?.uid || ''], // Auto-assign current user
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
          this.toastr.success('Your new restaurant has been successfully created.');
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
    
    // Add duplicate name check
    if (this.isDuplicateName) {
      this.toastr.error('A restaurant with this name already exists. Please choose a different name.');
      return;
    }
    
    const menuID = this.selectedMenu ? (typeof this.selectedMenu === 'string' ? this.selectedMenu : this.selectedMenu.menuID) : '';

    var tempRestaurant = {
      city: this.restaurant.city,
      mainContactID: this.currentRestaurant.mainContactID, // Keep existing main contact
      menuID: menuID,
      numberTables: this.selectedNumberTable,
      ownerID: this.currentUser.uid,
      province: this.restaurant.province,
      restaurantName: this.restaurant.name,
      status: this.restaurantStatus,
      streetAdress: this.restaurant.street,
      zip: this.restaurant.zip,
      assignedUsers: this.currentRestaurant.assignedUsers || [], // Keep existing assigned users
    };

    this.firestore
      .collection('restuarants')
      .doc(this.currentRestaurantID)
      .update(tempRestaurant)
      .then(() => {
        this.toastr.success('Your restaurant has been updated.');
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


  isFormValid(): boolean {
    return !!(
      this.restaurant.name &&
      this.restaurant.street &&
      this.restaurant.city &&
      this.restaurant.province &&
      this.restaurant.zip &&
      this.selectedNumberTable &&
      !this.isDuplicateName
    );
  }

  onSubmit() {
    if (!this.isFormValid()) {
      // Save as draft if form is not fully validated
      this.saveDraft();
      return;
    }
    
    if (this.mode === 'add') {
      this.addRestaurant();
    } else {
      this.editRestaurant();
    }
  }

}
