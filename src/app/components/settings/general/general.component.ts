import { Component } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { Observable, map } from 'rxjs';
import { ContentfulService } from '../../../shared/services/contentful.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { createClient } from 'contentful';
import { environment } from '../../../../environments/environment';
interface UserData {
  userId: string;
  firstName: string;
  surname: string;
  email: string;
  cellphoneNumber?: string;
  cardHolderName?: string;
  cardNumber?: string;
  cvv?: number;
  expiryDate?: string;
  accountMethod?: string;
  tcAccept?: boolean;
  marketingConsent?: boolean;
  tipsTutorials?: boolean;
  userInsights?: boolean;
  aboutUsDisplayed?: boolean;
}
@Component({
  selector: 'app-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss']
})
export class GeneralComponent {
  isTooltipOpen:boolean = false;
  aboutUsVisible: boolean = true;
  emailNotificationsEnabled: boolean = false;
  tipsAndTutorialsEnabled: boolean = false;
  userInsightsEnabled: boolean = false;
  isPopupMenuOpen: boolean[] = [];
  currentUser:any;
  currentUserData:any;
  userdateAll:any;
  accountForm!: FormGroup;
  userToSave!:UserData;
  userDataID:string = '';
  constructor(public authService: AuthService, public contentfulService: ContentfulService, private formBuilder: FormBuilder) {
    const userString = localStorage.getItem('user');
    if (userString) {
      this.currentUser = JSON.parse(userString);
      this.getUserData(this.currentUser.uid, 'userData');
      console.log(this.currentUser);
    }
  }

  ngOnInit(): void {
    this.accountForm = this.formBuilder.group({
      name: ['', Validators.required],
      surname:  ['', Validators.required],
      password:  ['', Validators.required],
      email:  [{value:'', disabled: true}, Validators.required],
      phone:  ['', Validators.required],
    });
  }

  getUserData(fieldValue: string, contentType: string) {
    const fieldName = "userId";
    this.contentfulService.getEntriesByField(contentType, fieldName, fieldValue).subscribe(
      (userData: any) => {
        this.userDataID = userData[0].sys.id;
        this.currentUserData = userData[0].fields;
        this.updateFormWithUserData();
        this.userdateAll = userData;
        console.log('User Data:', userData);
      },
      (error: any) => {
        console.error('Error fetching user data:', error);
      }
    );
  }

  updateFormWithUserData() {
    if (this.currentUserData && this.accountForm) {
      this.accountForm.patchValue({
        name: this.currentUserData.firstName['en-US'],
        surname: this.currentUserData.surname['en-US'],
        password: 'test123',
        email: this.currentUserData.email['en-US'],
        phone: this.currentUserData.cellphoneNumber['en-US'],

      });
    }
  }

  restaurants = [
    { name: 'Restaurant 1', status: 'active' },
    { name: 'Restaurant 2', status: 'inactive' },
    { name: 'Restaurant 3', status: 'active' }
  ];

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }
  
  opentooltip(){
    this.isTooltipOpen != this.isTooltipOpen;
  }

  saveAccountDetails() {
    
  }

  saveAll(){
    const userToSave = {
      firstName: { "en-US": this.accountForm.get('name')?.value },
      surname: { "en-US": this.accountForm.get('surname')?.value },
      cellphoneNumber: { "en-US": this.accountForm.get('phone')?.value },
    };

  

    this.contentfulService.getEntry(this.userdateAll[0].sys.id, 'userData')
    .subscribe((entry) => {
        entry.fields.firstName = {
            'en-US': 'Arizona'
        }
        return entry.save()
    });
}
}
