import { Component, OnInit, OnDestroy } from '@angular/core';
import { Menu } from '../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../shared/services/restaurant';
import { ToastService } from '../../shared/services/toast.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { MenuDetailsModalComponent, MenuDetailsData } from '../shared/menu-details-modal/menu-details-modal.component';
import { TableColumn, TableAction } from '../shared/data-table/data-table.component';
import { UnsavedChangesDialogComponent } from '../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-menus',
  templateUrl: './menus.component.html',
  styleUrl: './menus.component.scss'
})
export class MenusComponent implements OnInit, OnDestroy {
  activeMenus: Menu[] = [];
  draftMenus: Menu[] = [];
  restaurants: Restaurant[] = [];
  isSaving: boolean = false;
  isLoading: boolean = false;
  isPopupMenuOpenActive: boolean[] = [];
  isPopupMenuOpenDraft: boolean[] = [];
  selectedMenuId: string = '';
  tempRestaurant: Restaurant = {} as Restaurant;
  hasUnsavedChanges: boolean = false;
  
  private menusSubscription?: Subscription;
  private restaurantsSubscription?: Subscription;

  // Table configurations
  menuColumns: TableColumn[] = [
    {
      key: 'menuName',
      label: 'Menu Name',
      sortable: true
    },
    {
      key: 'restaurantID',
      label: 'Restaurant',
      sortable: true,
      format: (value, row: any) => {
        return this.getRestaurantName(value);
      }
    }
  ];

  draftMenuColumns: TableColumn[] = [
    {
      key: 'menuName',
      label: 'Menu Name',
      sortable: true
    },
    {
      key: 'restaurantID',
      label: 'Restaurant',
      sortable: true,
      format: (value, row: any) => {
        return this.getRestaurantName(value);
      }
    }
  ];

  menuActions: TableAction[] = [
    {
      key: 'view',
      label: 'View Details',
      icon: 'visibility',
      color: 'secondary'
    },
    {
      key: 'edit',
      label: 'Edit Menu',
      icon: 'edit',
      color: 'secondary'
    },
    {
      key: 'delete',
      label: 'Delete Menu',
      icon: 'delete',
      color: 'danger'
    }
  ];

  draftMenuActions: TableAction[] = [
    {
      key: 'view',
      label: 'View Details',
      icon: 'visibility',
      color: 'secondary'
    },
    {
      key: 'edit',
      label: 'Edit Menu',
      icon: 'edit',
      color: 'secondary'
    },
    {
      key: 'delete',
      label: 'Delete Menu',
      icon: 'delete',
      color: 'danger'
    }
  ];
  constructor(
    private firestore: AngularFirestore,
    private toast: ToastService,
    private dialog: MatDialog,
    private router: Router
  ) {
  }


  ngOnInit() {
    this.isSaving = true;
    this.fetchMenus();
  }

  deleteQR(id: string, index: number, menuName: string) {
    const data: DeleteConfirmationData = {
      title: 'Remove QR Code',
      itemName: menuName,
      itemType: 'QR code assignment',
      message: `Are you sure you want to remove the QR code assignment from "${menuName}"? This will disable QR code access for this menu.`,
      confirmButtonText: 'Yes, Remove',
      cancelButtonText: 'Cancel'
    };

    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent, {
      width: '450px',
      panelClass: 'delete-confirmation-modal-panel',
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performQRDeletion(id, index);
      }
    });
  }

  private performQRDeletion(id: string, index: number) {
    const dataToUpdate = {
      qrAssigned: false,
      qrUrl: ''
    };

    this.firestore.doc(`menus/${id}`).update(dataToUpdate)
      .then(() => {
        this.isPopupMenuOpenActive[index] = false;
        this.isPopupMenuOpenDraft[index] = false;
        this.toast.success('QR code assignment removed!');
      })
      .catch((error) => {
        console.log(error);
      });
  }

  private fetchMenus() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const OwnerID = user.uid;

    // Unsubscribe from previous subscription if it exists
    if (this.menusSubscription) {
      this.menusSubscription.unsubscribe();
    }

    // Fetch menus - valueChanges() provides real-time updates, so no need to refetch after deletion
    // Use idField to include the Firestore document ID for deletion
    this.menusSubscription = this.firestore.collection<Menu>('menus', ref => ref.where('OwnerID', '==', OwnerID))
      .valueChanges({ idField: 'firestoreId' })
      .subscribe({
        next: (menus: any[]) => {
          // Ensure each menu has the Firestore document ID available
          // firestoreId is automatically added by idField option
          // Map menuID to use the Firestore document ID for delete/update operations
          const menusWithId = menus.map(menu => ({
            ...menu,
            menuID: menu.firestoreId || menu.menuID // Use Firestore document ID for operations
          }));
          
          this.activeMenus = menusWithId.filter(menu => !menu.isDraft);
          this.draftMenus = menusWithId.filter(menu => menu.isDraft);
          this.isLoading = false;

          // Fetch restaurants for the same owner (only once or when needed)
          if (!this.restaurantsSubscription) {
            this.fetchRestaurants(OwnerID);
          }
        },
        error: (error) => {
          console.error('Error fetching menus:', error);
          this.toast.error('Failed to load menus. Please refresh the page.');
          this.isLoading = false;
        }
      });
  }

  private fetchRestaurants(ownerId: string) {
    // Unsubscribe from previous subscription if it exists
    if (this.restaurantsSubscription) {
      this.restaurantsSubscription.unsubscribe();
    }

    this.restaurantsSubscription = this.firestore.collection<Restaurant>('restaurants', ref => ref.where('ownerID', '==', ownerId))
      .valueChanges()
      .subscribe({
        next: (restaurants) => {
          this.restaurants = restaurants;
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error fetching restaurants:', error);
          this.isSaving = false;
        }
      });
  }

  private getRestaurantName(restaurantId: string): string {
    if (!restaurantId || !this.restaurants.length) {
      return 'No restaurant assigned';
    }

    const restaurant = this.restaurants.find(r => r.restaurantID === restaurantId);
    return restaurant ? restaurant.restaurantName : 'Unknown restaurant';
  }

  togglePopupMenuActive(index: number) {
    this.isPopupMenuOpenActive[index] = !this.isPopupMenuOpenActive[index];
  }

  togglePopupMenuDraft(index: number) {
    this.isPopupMenuOpenDraft[index] = !this.isPopupMenuOpenDraft[index];
  }

  closeAllPopups() {
    this.isPopupMenuOpenActive = new Array(this.activeMenus.length).fill(false);
    this.isPopupMenuOpenDraft = new Array(this.draftMenus.length).fill(false);
  }

  deleteMenu(id: string, menuName: string) {
    const data: DeleteConfirmationData = {
      title: 'Delete Menu',
      itemName: menuName,
      itemType: 'menu',
      message: `Are you sure you want to permanently delete the menu "${menuName}"? This action cannot be undone and will remove all menu items, categories, and associated data.`,
      confirmButtonText: 'Yes, Delete Menu',
      cancelButtonText: 'Cancel'
    };

    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent, {
      width: '450px',
      panelClass: 'delete-confirmation-modal-panel',
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performMenuDeletion(id);
      }
    });
  }

  private performMenuDeletion(id: string) {
    this.isSaving = true;
    
    // Find the menu to get the correct Firestore document ID
    // The id parameter might be menuID field or firestoreId
    const allMenus = [...this.activeMenus, ...this.draftMenus];
    const menuToDelete = allMenus.find(
      menu => menu.menuID === id || (menu as any).firestoreId === id || (menu as any).id === id
    );
    
    // Determine the actual Firestore document ID
    // Prefer firestoreId (from idField), then menuID, then the passed id
    const documentId = menuToDelete 
      ? ((menuToDelete as any).firestoreId || menuToDelete.menuID || id)
      : id;
    
    console.log('Deleting menu:', { 
      passedId: id, 
      documentId, 
      menuFound: !!menuToDelete,
      menuName: menuToDelete?.menuName 
    });
    
    if (!documentId) {
      console.error('Could not determine document ID for deletion');
      this.toast.error('Could not find menu to delete. Please refresh the page.');
      this.isSaving = false;
      return;
    }
    
    this.firestore.doc(`menus/${documentId}`).delete()
      .then(() => {
        // No need to call fetchMenus() - valueChanges() will automatically update the UI
        this.closeAllPopups();
        this.toast.success('Menu has been deleted!');
        this.isSaving = false;
      })
      .catch((error) => {
        console.error('Error deleting menu:', error);
        console.error('Document ID attempted:', documentId);
        const errorMessage = error?.message || error?.code || 'Unknown error';
        this.toast.error(`Failed to delete menu: ${errorMessage}. Please try again.`);
        this.isSaving = false;
      });
  }

  updateMenuStatus(menu: Menu, newStatus: boolean) {
    // Convert boolean to string for the Menu interface
    const statusString = newStatus ? 'Active' : 'Inactive';

    // Update the local menu object
    menu.Status = statusString;

    // Save to Firestore
    this.isSaving = true;

    this.firestore.doc(`menus/${menu.menuID}`).update({ Status: statusString })
      .then(() => {
        this.isSaving = false;
      })
      .catch((error) => {
        console.log(error);
        this.isSaving = false;
        // Revert the local change on error
        menu.Status = !newStatus ? 'Active' : 'Inactive';
      });
  }

  // Helper method to get boolean status for mat-slide-toggle binding
  getMenuStatusBoolean(menu: Menu): boolean {
    return menu.Status === 'Active';
  }

  viewMenuDetails(menu: Menu) {
    const data: MenuDetailsData = {
      menu: menu
    };

    const dialogRef = this.dialog.open(MenuDetailsModalComponent, {
      width: '500px',
      panelClass: 'menu-details-modal-panel',
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'edit') {
        // Navigate to edit page with unsaved changes check
        this.navigateWithUnsavedChangesCheck(['/menus/edit-menu', menu.menuID, 1]);
      }
    });
  }

  navigateToAddMenu() {
    this.navigateWithUnsavedChangesCheck(['/menus/add-menu/1']);
  }

  /**
   * Handle active menu table actions
   */
  onMenuAction(event: any) {
    const { action, row, index } = event;

    switch (action.key) {
      case 'view':
        this.viewMenuDetails(row);
        break;
      case 'edit':
        // Navigate to edit menu page with unsaved changes check
        this.navigateWithUnsavedChangesCheck(['/menus/edit-menu', row.menuID]);
        break;
      case 'delete':
        this.deleteMenu(row.menuID, row.menuName);
        break;
    }
  }

  /**
   * Handle draft menu table actions
   */
  onDraftMenuAction(event: any) {
    const { action, row, index } = event;

    switch (action.key) {
      case 'view':
        this.viewMenuDetails(row);
        break;
      case 'edit':
        // Navigate to edit menu page with unsaved changes check
        this.navigateWithUnsavedChangesCheck(['/menus/edit-menu', row.menuID]);
        break;
      case 'delete':
        this.deleteMenu(row.menuID, row.menuName);
        break;
    }
  }

  /**
   * Handle active menu row click - trigger first available action
   */
  onRowClick(event: any) {
    const { row, index } = event;

    // Find the first available action for this row
    const firstAvailableAction = this.menuActions.find(action =>
      action.visible ? action.visible(row) : true
    );

    if (firstAvailableAction) {
      this.onMenuAction({ action: firstAvailableAction, row, index });
    }
  }

  /**
   * Handle draft menu row click - trigger first available action
   */
  onDraftRowClick(event: any) {
    const { row, index } = event;

    // Find the first available action for this row
    const firstAvailableAction = this.draftMenuActions.find(action =>
      action.visible ? action.visible(row) : true
    );

    if (firstAvailableAction) {
      this.onDraftMenuAction({ action: firstAvailableAction, row, index });
    }
  }

  // Navigation safety methods
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

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    if (this.menusSubscription) {
      this.menusSubscription.unsubscribe();
    }
    if (this.restaurantsSubscription) {
      this.restaurantsSubscription.unsubscribe();
    }
  }
}
