import { Component, Input, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Menu } from '../../../shared/services/menu';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';

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
  getCurrentCode(menuId: string){
    return this.qrCodeDownloadLink = environment.menuUrl + menuId;
  }
  onChangeURL(url: SafeUrl) {
    this.qrCodeDownloadLink = environment.menuUrl + url;
  }
  openPopup(menuID:string) {
    this.selectedID = menuID;
    this.showPopup = true;
    this.fetchMenu();
    
  }

  closePopup() {
    this.showPopup = false;
  }
  downloadQRCode() {
    const qrElement = document.querySelector('qrcode canvas') as HTMLCanvasElement;
    
    if (qrElement) {
      const imageUrl = qrElement.toDataURL('image/png'); // Convert to Image
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'qrcode.png'; // Set file name
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error("QR code canvas not found!");
    }
  }
  
  private fetchMenu() {
    this.firestore.collection<Menu>('menus', ref => ref.where('menuID', '==', this.selectedID))
      .valueChanges()
      .subscribe(menus => {
        this.currentMenu = menus[0];
      });
  }

}
