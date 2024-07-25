import { Component, OnInit } from '@angular/core';
import { Menu } from '../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../shared/services/restaurant';
import { SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-qr-codes',
  templateUrl: './qr-codes.component.html',
  styleUrl: './qr-codes.component.scss'
})
export class QrCodesComponent implements OnInit {
  menus: Menu[] = [];
  isSaving: boolean = false;
  isPopupMenuOpen: boolean[] = [];
  selectedMenuId: string = ''; 
  tempRestaurant:Restaurant = {} as Restaurant;
  public qrCodeDownloadLink: SafeUrl = "";
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
