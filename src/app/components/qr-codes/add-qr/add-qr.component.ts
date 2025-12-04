import { Component, Input } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { Menu } from '../../../shared/services/menu';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { environment } from '../../../../environments/environment';
import { SelectOption } from '../../shared/form-select/form-select.component';

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
  validationError: boolean = false;
  saveSuccess: boolean = false;

  constructor(private firestore: AngularFirestore) { }

  getQRCodeData(menuId: string): string {
    return environment.menuUrl + menuId;
  }

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

  selectMenu(menuValue: any) {
    // Handle both Menu object and menu ID
    const menu = typeof menuValue === 'object' ? menuValue : this.filteredMenus.find(m => m.menuID === menuValue);
    if (menu) {
      this.selectedMenu = menu;
      this.validationError = false;
    }
  }

  // Get menu options for app-form-select
  get menuOptions(): SelectOption[] {
    return this.filteredMenus.map(menu => ({
      value: menu,
      label: menu.menuName
    }));
  }

  saveSettings() {
    if (this.selectedMenu) {
      this.validationError = false;
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
      })
      .catch((error) => {
        this.saveSuccess = false;
        console.log(error);
      });
  }
}
