import { Component, Input } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { Menu } from '../../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-add-qr',
  templateUrl: './add-qr.component.html',
  styleUrl: './add-qr.component.scss'
})
export class AddQrComponent {
  @Input() menus: Menu[] = [];
  showPopup: boolean = false;
  isSaving: boolean = false;
  public qrCodeDownloadLink: SafeUrl = "";
  filteredMenus: Menu[] = [];
  selectedMenu: Menu | undefined;
  validationError:boolean= false;
  saveSuccess:boolean= false;

  constructor(private firestore: AngularFirestore) {}

  onChangeURL(url: SafeUrl) {
    this.qrCodeDownloadLink = url;
  }

  openPopup() {
    this.filteredMenus = this.menus.filter(menu => !menu.qrAssigned);
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
  }

  selectMenu(menu: Menu) {
    this.selectedMenu = menu;
    this.validationError = false; 
  }

  saveSettings(){
    if (this.selectedMenu) {
      this.validationError = false;
      console.log('Selected Menu:', this.selectedMenu);
      this.updateMenuQrData(this.selectedMenu.menuID, this.qrCodeDownloadLink);
    } else {
      this.validationError = true;
    }
  }


  updateMenuQrData(menuId: string,  qrUrl: SafeUrl) {
    const qrUrlString = qrUrl.toString();
    const dataToUpdate = {
      qrAssigned: true,
      qrUrl: qrUrlString
    };

    this.firestore.doc(`menus/${menuId}`).update(dataToUpdate)
      .then(() => {
        this.saveSuccess = true;
      })
      .catch((error) => {
        this.saveSuccess = false;
        console.log(error);
      }); 
  }
}
