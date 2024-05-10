import { Component, OnInit } from '@angular/core';
import { Menu } from '../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-menus',
  templateUrl: './menus.component.html',
  styleUrl: './menus.component.scss'
})
export class MenusComponent implements OnInit{
  activeMenus: Menu[] = [];
  draftMenus: Menu[] = [];
  isSaving: boolean = false;
  isPopupMenuOpen: boolean[] = [];
  selectedMenuId: string = ''; 
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
        this.activeMenus = menus.filter(menu => !menu.isDraft);
        this.draftMenus = menus.filter(menu => menu.isDraft);
        this.isSaving = false;
      });
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }
}
