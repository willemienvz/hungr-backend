import { Component, Input, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Menu } from '../../../shared/services/menu';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
@Component({
  selector: 'app-view-qr',
  templateUrl: './view-qr.component.html',
  styleUrl: './view-qr.component.scss'
})
export class ViewQrComponent implements OnInit {
  showPopup: boolean = false;
  selectedID:string='';
  qrCodeUrlToShow: SafeResourceUrl | undefined;
  public qrCodeDownloadLink: SafeUrl = "";

  currentMenu: Menu= {} as Menu;
  constructor(private firestore: AngularFirestore,private sanitizer: DomSanitizer) {
  }

  ngOnInit() {
    
  }
  
  onChangeURL(url: SafeUrl) {
    this.qrCodeDownloadLink = url;
  }
  openPopup(menuID:string) {
    this.selectedID = menuID;
    this.showPopup = true;
    this.fetchMenu();
    
  }

  closePopup() {
    this.showPopup = false;
  }

  private fetchMenu() {
    this.firestore.collection<Menu>('menus', ref => ref.where('menuID', '==', this.selectedID))
      .valueChanges()
      .subscribe(menus => {
        console.log(menus);
        this.currentMenu = menus[0];
      });
  }

}
