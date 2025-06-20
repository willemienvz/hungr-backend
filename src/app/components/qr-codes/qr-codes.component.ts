import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Menu } from '../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../shared/services/restaurant';
import { SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { AddQrComponent } from './add-qr/add-qr.component';

@Component({
  selector: 'app-qr-codes',
  templateUrl: './qr-codes.component.html',
  styleUrl: './qr-codes.component.scss'
})
export class QrCodesComponent implements OnInit, AfterViewInit {
  @ViewChild('newQR') addQrComponent!: AddQrComponent;
  
  menus: Menu[] = [];
  isSaving: boolean = false;
  isPopupMenuOpen: boolean[] = [];
  selectedMenuId: string = ''; 
  tempRestaurant:Restaurant = {} as Restaurant;
  public qrCodeDownloadLink: SafeUrl = "";
  
  constructor(
    private firestore: AngularFirestore,
    private route: ActivatedRoute
  ) {
  }

  
  ngOnInit() {
    this.isSaving = true;
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

  deleteQR(id:string, index:number){
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
    this.firestore.collection<Menu>('menus', ref => ref.where('OwnerID', '==', OwnerID))
      .valueChanges()
      .subscribe(menus => {
        this.menus = menus;
        console.log(menus);
        this.isSaving = false;
      });
  }

  download(url:string){
    console.log(url);
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }


}
