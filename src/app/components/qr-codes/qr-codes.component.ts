import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Menu } from '../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../shared/services/restaurant';
import { SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { AddQrComponent } from './add-qr/add-qr.component';
import { TableColumn, TableAction } from '../shared/data-table/data-table.component';
import { environment } from '../../../environments/environment';
import * as QRCode from 'qrcode';

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
  private processingRowId: string | null = null;

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
      key: 'download',
      label: 'Download QR Code',
      icon: 'download',
      color: 'primary',
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
              // Show add QR modal for this specific menu - pass menu directly
              this.addQrComponent.openPopup(menu);
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
    this.firestore.collection<Restaurant>('restaurants', ref => ref.where('ownerID', '==', ownerId))
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
    try {
      const { action, row, index } = event;

      switch (action.key) {
        case 'view':
          if (this.viewQR) {
            this.viewQR.openPopup(row.menuID);
          }
          break;
        case 'download':
          this.downloadQRCode(row.menuID, row.menuName);
          break;
        case 'create':
          if (this.addQrComponent) {
            // Open modal directly with the selected menu - no dropdown needed
            this.addQrComponent.openPopup(row);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling menu action:', error);
      this.processingRowId = null; // Reset flag on error
    }
  }

  /**
   * Handle row click - trigger first available action
   */
  onRowClick(event: any) {
    const { row, index } = event;

    // Get unique identifier for this row
    const rowId = row.menuID || row.id || `row-${index}`;

    // Prevent infinite loops by checking if we're already processing this specific row
    // Also check if modal is already open (dropdown might cause re-renders)
    if (this.processingRowId === rowId || 
        this.isSaving || 
        (this.addQrComponent && this.addQrComponent.showPopup)) {
      return;
    }

    // Find the first available action for this row
    const firstAvailableAction = this.menuActions.find(action =>
      action.visible ? action.visible(row) : true
    );

    if (firstAvailableAction) {
      // Mark this row as being processed
      this.processingRowId = rowId;
      
      // Execute the action
      try {
        this.onMenuAction({ action: firstAvailableAction, row, index });
      } catch (error) {
        console.error('Error in onMenuAction:', error);
        this.processingRowId = null; // Reset on error
      } finally {
        // Reset the flag after modal has time to open (longer delay to prevent re-triggering)
        setTimeout(() => {
          this.processingRowId = null;
        }, 2000); // Increased to 2 seconds to ensure modal is fully open and dropdown initialized
      }
    }
  }

  /**
   * Download QR code for a menu
   */
  downloadQRCode(menuId: string, menuName: string): void {
    const qrData = environment.menuUrl + menuId;
    const fileName = `${menuName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qrcode.png`;

    QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
      .then((dataUrl: string) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((error: any) => {
        console.error('Error generating QR code:', error);
      });
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  openAddQrModal(menu?: Menu) {
    this.addQrComponent.openPopup(menu);
  }

}
