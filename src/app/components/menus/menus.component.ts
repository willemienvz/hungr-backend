import { Component, OnInit } from '@angular/core';
import { Menu } from '../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../shared/services/restaurant';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { MenuDetailsModalComponent, MenuDetailsData } from '../shared/menu-details-modal/menu-details-modal.component';
import { TableColumn, TableAction } from '../shared/data-table/data-table.component';
import { UnsavedChangesDialogComponent } from '../unsaved-changes-dialog/unsaved-changes-dialog.component';

@Component({
  selector: 'app-menus',
  templateUrl: './menus.component.html',
  styleUrl: './menus.component.scss'
})
export class MenusComponent implements OnInit {
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
    private toastr: ToastrService,
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
        this.toastr.success('QR code assignment removed!');
      })
      .catch((error) => {
        console.log(error);
      });
  }

  private fetchMenus() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const OwnerID = user.uid;

    // Fetch menus
    this.firestore.collection<Menu>('menus', ref => ref.where('OwnerID', '==', OwnerID))
      .valueChanges()
      .subscribe(menus => {
        this.activeMenus = menus.filter(menu => !menu.isDraft);
        this.draftMenus = menus.filter(menu => menu.isDraft);

        // Fetch restaurants for the same owner
        this.fetchRestaurants(OwnerID);
      });
  }

  private fetchRestaurants(ownerId: string) {
    this.firestore.collection<Restaurant>('restuarants', ref => ref.where('ownerID', '==', ownerId))
      .valueChanges()
      .subscribe(restaurants => {
        this.restaurants = restaurants;
        this.isSaving = false;
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
    this.firestore.doc(`menus/${id}`).delete()
      .then(() => {
        this.fetchMenus();
        this.closeAllPopups();
        this.toastr.success('Menu has been deleted!');
        this.isSaving = false;
      })
      .catch((error) => {
        console.log(error);
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
}
