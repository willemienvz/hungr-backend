import { Component, OnInit } from '@angular/core';
import { Menu } from '../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../shared/services/restaurant';

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
  constructor(private firestore: AngularFirestore) {
  }

  
  ngOnInit() {
    this.isSaving = true;
    this.fetchMenus();
  }

  deleteQR(id:string, index:number){
    const dataToUpdate = {
      qrAssigned: false,
      qrUrl: ''
    };

    this.firestore.doc(`menus/${id}`).update(dataToUpdate)
      .then(() => {
        this.isPopupMenuOpenActive[index] = false;
        this.isPopupMenuOpenDraft[index] = false;
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

  deleteMenu(id: string) {
    this.firestore.doc(`menus/${id}`).delete()
      .then(() => {
        this.fetchMenus();
        this.closeAllPopups();
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
}
