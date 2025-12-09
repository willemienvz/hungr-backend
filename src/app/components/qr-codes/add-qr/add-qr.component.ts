import { Component, Input } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { Menu } from '../../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { environment } from '../../../../environments/environment';

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
  selectedMenu: Menu | undefined;
  validationError: boolean = false;
  saveSuccess: boolean = false;

  constructor(private firestore: AngularFirestore) { }

  getQRCodeData(menuId: string): string {
    return environment.menuUrl + menuId;
  }

  onChangeURL(url: SafeUrl) {
    this.qrCodeDownloadLink = url;
  }

  openPopup(menu?: Menu) {
    if (menu) {
      this.selectedMenu = menu;
      this.validationError = false;
      this.saveSuccess = false;
    }
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
    this.selectedMenu = undefined;
    this.qrCodeDownloadLink = "";
    this.validationError = false;
    this.saveSuccess = false;
  }

  saveSettings() {
    if (this.selectedMenu && this.qrCodeDownloadLink) {
      this.validationError = false;
      this.isSaving = true;
      this.updateMenuQrData(this.selectedMenu.menuID, this.qrCodeDownloadLink);
    } else {
      this.validationError = true;
    }
  }


  updateMenuQrData(menuId: string, qrUrl: SafeUrl) {
    const qrUrlString = qrUrl.toString();
    const dataToUpdate = {
      qrAssigned: true,
      qrUrl: qrUrlString
    };

    this.firestore.doc(`menus/${menuId}`).update(dataToUpdate)
      .then(() => {
        this.saveSuccess = true;
        this.isSaving = false;
        // Auto-close after a short delay
        setTimeout(() => {
          this.closePopup();
        }, 1500);
      })
      .catch((error) => {
        this.saveSuccess = false;
        this.isSaving = false;
        console.log(error);
      });
  }
}
