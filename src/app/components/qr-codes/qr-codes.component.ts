import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Menu } from '../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../shared/services/restaurant';
import { SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { AddQrComponent } from './add-qr/add-qr.component';
import { TableColumn, TableAction } from '../shared/data-table/data-table.component';

@Component({
  selector: 'app-qr-codes',
  templateUrl: './qr-codes.component.html',
  styleUrl: './qr-codes.component.scss'
})
export class QrCodesComponent implements OnInit, AfterViewInit {
  @ViewChild('newQR') addQrComponent!: AddQrComponent;
  @ViewChild('viewQR') viewQR!: any;

  menus: Menu[] = [];
  restaurants: Restaurant[] = [];
  isSaving: boolean = false;
  isLoading: boolean = false;
  isPopupMenuOpen: boolean[] = [];
  selectedMenuId: string = '';
  tempRestaurant: Restaurant = {} as Restaurant;
  public qrCodeDownloadLink: SafeUrl = "";

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

  menuActions: TableAction[] = [
    {
      key: 'view',
      label: 'View QR Code',
      icon: 'visibility',
      color: 'secondary',
      visible: (menu: Menu) => menu.qrAssigned
    },
    {
      key: 'create',
      label: 'Create QR Code',
      icon: 'qr_code',
      color: 'primary',
      visible: (menu: Menu) => !menu.qrAssigned
    }
  ];



  constructor(
    private firestore: AngularFirestore,
    private route: ActivatedRoute
  ) {
  }


  ngOnInit() {
    this.isLoading = true;
    this.fetchMenus();
  }

  ngAfterViewInit() {
    // Check for query parameter to automatically open QR modal
    this.route.queryParams.subscribe(params => {
      const showMenuId = params['show'];
      if (showMenuId) {
        // Wait for menus to load first
        setTimeout(() => {
          const menu = this.menus.find(m => m.menuID === showMenuId);
          if (menu) {
            // Check if menu already has QR assigned
            if (menu.qrAssigned) {
              // Show existing QR - this would require implementing a view modal
              console.log('Menu already has QR assigned');
            } else {
              // Show add QR modal for this specific menu
              this.addQrComponent.openPopup();
              // Pre-select the menu if the add component supports it
              setTimeout(() => {
                if (this.addQrComponent.filteredMenus && this.addQrComponent.filteredMenus.length > 0) {
                  const targetMenu = this.addQrComponent.filteredMenus.find(m => m.menuID === showMenuId);
                  if (targetMenu) {
                    this.addQrComponent.selectMenu(targetMenu);
                  }
                }
              }, 100);
            }
          }
        }, 500); // Wait for menus to load
      }
    });
  }

  deleteQR(id: string, index: number) {
    const dataToUpdate = {
      qrAssigned: false,
      qrUrl: ''
    };

    this.firestore.doc(`menus/${id}`).update(dataToUpdate)
      .then(() => {
        this.togglePopupMenu(index);
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
        this.menus = menus;
        console.log(menus);

        // Fetch restaurants for the same owner
        this.fetchRestaurants(OwnerID);
      });
  }

  private fetchRestaurants(ownerId: string) {
    this.firestore.collection<Restaurant>('restuarants', ref => ref.where('ownerID', '==', ownerId))
      .valueChanges()
      .subscribe(restaurants => {
        this.restaurants = restaurants;
        this.isLoading = false;
      });
  }

  private getRestaurantName(restaurantId: string): string {
    if (!restaurantId || !this.restaurants.length) {
      return 'No restaurant assigned';
    }

    const restaurant = this.restaurants.find(r => r.restaurantID === restaurantId);
    return restaurant ? restaurant.restaurantName : 'Unknown restaurant';
  }

  /**
   * Get count of menus with QR codes assigned
   */
  getQrAssignedCount(): number {
    return this.menus.filter(menu => menu.qrAssigned).length;
  }

  /**
   * Get count of menus without QR codes
   */
  getMenusWithoutQrCount(): number {
    return this.menus.filter(menu => !menu.qrAssigned).length;
  }

  /**
   * Handle menu table actions
   */
  onMenuAction(event: any) {
    const { action, row, index } = event;

    switch (action.key) {
      case 'view':
        this.viewQR.openPopup(row.menuID);
        break;
      case 'create':
        this.openAddQrModal();
        // Optionally pre-select the menu
        setTimeout(() => {
          if (this.addQrComponent && this.addQrComponent.filteredMenus) {
            const targetMenu = this.addQrComponent.filteredMenus.find((m: Menu) => m.menuID === row.menuID);
            if (targetMenu) {
              this.addQrComponent.selectMenu(targetMenu);
            }
          }
        }, 100);
        break;
    }
  }

  /**
   * Handle row click - trigger first available action
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

  download(url: string) {
    console.log(url);
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  openAddQrModal() {
    this.addQrComponent.openPopup();
  }

}
