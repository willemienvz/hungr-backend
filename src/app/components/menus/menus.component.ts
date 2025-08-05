import { Component, OnInit } from '@angular/core';
import { Menu } from '../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../shared/services/restaurant';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { MenuDetailsModalComponent, MenuDetailsData } from '../shared/menu-details-modal/menu-details-modal.component';

@Component({
  selector: 'app-menus',
  templateUrl: './menus.component.html',
  styleUrl: './menus.component.scss'
})
export class MenusComponent implements OnInit{
  activeMenus: Menu[] = [];
  draftMenus: Menu[] = [];
  isSaving: boolean = false;
  isPopupMenuOpenActive: boolean[] = [];
  isPopupMenuOpenDraft: boolean[] = [];
  selectedMenuId: string = ''; 
  tempRestaurant:Restaurant = {} as Restaurant;
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

  deleteQR(id:string, index:number, menuName: string){
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
    this.firestore.collection<Menu>('menus', ref => ref.where('OwnerID', '==', OwnerID))
      .valueChanges()
      .subscribe(menus => {
        this.activeMenus = menus.filter(menu => !menu.isDraft);
        this.draftMenus = menus.filter(menu => menu.isDraft);
        this.isSaving = false;
      });
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

  updateMenuStatus(menu: Menu) {
    this.isSaving = true;
    
    this.firestore.doc(`menus/${menu.menuID}`).update({ Status: menu.Status })
      .then(() => {
        this.isSaving = false;
      })
      .catch((error) => {
        console.log(error);
        this.isSaving = false;
      });
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
        // Navigate to edit page
        this.router.navigate(['/menus/edit-menu', menu.menuID, 1]);
      }
    });
  }

  navigateToAddMenu() {
    this.router.navigate(['/menus/add-menu/1']);
  }
}
