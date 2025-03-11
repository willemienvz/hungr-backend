import { Injectable, NgZone } from '@angular/core';
import { User } from '../services/user';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import * as auth from 'firebase/auth';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { DataService } from './data.service';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  userData: any; // Save logged in user data
  constructor(
    public afs: AngularFirestore, // Inject Firestore service
    public afAuth: AngularFireAuth, // Inject Firebase auth service
    public router: Router,
    public ngZone: NgZone,
    public dataService: DataService,
     private toastr: ToastrService,
   
  ) {
    /* Saving user data in localstorage when 
    logged in and setting up null when logged out */
    this.afAuth.authState.subscribe((user) => {
      if (user) {
        this.userData = user;
        localStorage.setItem('user', JSON.stringify(this.userData));
        JSON.parse(localStorage.getItem('user')!);
      } else {
        localStorage.setItem('user', 'null');
        JSON.parse(localStorage.getItem('user')!);
      }
    });
  }

   /**
   * Checks if an email is already registered with Firebase.
   * @param email The email to check.
   * @returns A Promise<boolean> indicating whether the email is in use.
   */
   async isEmailInUse(email: string): Promise<boolean> {
    try {
      const signInMethods = await this.afAuth.fetchSignInMethodsForEmail(email);
      console.log('a', signInMethods)
      return signInMethods.length > 0;
    } catch (error) {
      console.error('Error checking email:', error);
      throw new Error('Unable to check email availability at this time.');
    }
  }
  // Sign in with email/password
 SignIn(email: string, password: string) {
  return this.afAuth
    .signInWithEmailAndPassword(email, password)
    .then(async (result) => {
      const user = result.user;
      if (user) {
        await user.reload(); 

        if (!user.emailVerified) {
          this.toastr.warning('Your email is not verified. You may have limited access.');
        } else {
          this.toastr.success('Login successful!');
        }

        this.router.navigate(['dashboard']); 
      }
    })
    .catch((error) => {
      this.toastr.error('Invalid email and/or password combination.');
    });
}

  // Sign up with email/password
  SignUp(email: string, password: string, formDataStep1:any, formDataStep2:any,  formDataStep3:any) {
  /*   return this.afAuth
      .createUserWithEmailAndPassword(email, password)
      .then((result) => {
        this.SendVerificationMail();
        result.user.updateProfile({
          displayName: formDataStep1.firstName
        });
        this.SetUserData(result.user, formDataStep1, formDataStep2, formDataStep3);
      })
      .catch((error) => {
        this.toastr.error(error.message)
      }); */

  }

  SignUpEditor(email: string, data: any): Promise<void> {
    const user = JSON.parse(localStorage.getItem('user')!);
    const parentId = user.uid;
    const password = 'th1s1s@t3mpP@ssw0rdPl3@s3Ch@ng3m3!123';
  
    return new Promise<void>((resolve, reject) => {
      this.afAuth.createUserWithEmailAndPassword(email, password)
        .then((result) => {
          this.SendVerificationMailEditor();
          this.SetUserDataEditor(result.user, data.email, data.lastname, data.name, data.phone, parentId);
          resolve(); 
        })
        .catch((error) => {
          reject(error); 
        });
    });
  }

  // Send email verfificaiton when new user sign up
  SendVerificationMail() {
    return this.afAuth.currentUser
      .then((u: any) => u.sendEmailVerification())
      .then(() => {
        this.router.navigate(['verify-email-address']);
      });
  }

   // Send email verfificaiton when new editor sign up
   SendVerificationMailEditor() {
    const currentUser = this.afAuth.currentUser;
    if (currentUser) {
      return currentUser.then((user: any) => {
        return user.sendEmailVerification().then(() => {
        }).catch((error: any) => {
          console.log('Error sending verification email: ' + error.message);
        });
      }).catch((error: any) => {
        console.log('Error getting current user: ' + error.message);
      });
    } else {
      console.log('No user is currently signed in.');
      return Promise.resolve();
    }
  }
  // Reset Forggot password
  ForgotPassword(passwordResetEmail: string) {
    return this.afAuth
      .sendPasswordResetEmail(passwordResetEmail,  {
        url: 'http://localhost:4200/password-reset' 
      })
      .then(() => {
        this.toastr.success('Password reset email sent, check your inbox.')
      })
      .catch((error) => {
        this.toastr.error(error)
      });
  }
  // Returns true when user is looged in and email is verified
  get isLoggedIn(): boolean {
    const user = JSON.parse(localStorage.getItem('user')!);
    return user !== null && user.emailVerified !== false ? true : false;
  }
  /* Setting up user data when sign in with username/password, 
  sign up with username/password and sign in with social auth  
  provider in Firestore database using AngularFirestore + AngularFirestoreDocument service */
  SetUserData(user: any, formData:any) {
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(
      `users/${user.uid}`
    );
    console.log('userRef', userRef);
  
    const userData: User = {
      uid: user.uid,
      firstName: formData.firstName,
      Surname: formData.lastName,
      email: formData.userEmail,
      cellphoneNumber: formData.cellphone,
      emailVerified: user.emailVerified,
      marketingConsent:formData.receiveMarketingInfo,
      tipsTutorials:formData.receiveMarketingInfo,
      userInsights:formData.receiveMarketingInfo,
      aboutUsDisplayed:false,
      cardHolderName: '',
      cardNumber:'',
      cvv: 0,
      expiryDate: '',
      accountType:'admin',
      subscriptionType: formData.billingOption,
      parentId:'',
      about: {
        aboutText: '',
        businessHours: '',
        email: '',
        cellphone: '',
        isBusinessHoursVisible: false,
        isContactDetailsVisible: false,
        mainImageUrl: '',
        additionalImageUrl: ''
    }
    };
    console.log('userData', userData);
    return userRef.set(userData, {
      merge: true,
    });
  }
  SetUserDataEditor(user: any, email: string, lastName:string, firstName:string, phone:string, parentId:string) {
      const userRef: AngularFirestoreDocument<any> = this.afs.doc(
        `users/${user.uid}`
      );
      const userData: User = {
        uid: user.uid,
        firstName: firstName,
        Surname: lastName,
        email: email,
        cellphoneNumber: phone,
        emailVerified: user.emailVerified,
        marketingConsent: false,
        tipsTutorials: false,
        userInsights: false,
        aboutUsDisplayed: false,
        cardHolderName: '',
        cardNumber: '',
        cvv: 0,
        expiryDate: '',
        accountType: 'editor',
        subscriptionType: '',
        parentId: parentId,
        about: {
          aboutText: '',
          businessHours: '',
          email: '',
          cellphone: '',
          isBusinessHoursVisible: false,
          isContactDetailsVisible: false,
          mainImageUrl: '',
          additionalImageUrl: ''
      }

      };
      return userRef.set(userData, {
        merge: true,
      });
  }
  
  // Sign out
  SignOut() {
    return this.afAuth.signOut().then(() => {
      localStorage.removeItem('user');
      this.router.navigate(['sign-in']);
    });
  }

  getCurrentUserId(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.afAuth.onAuthStateChanged((user) => {
        if (user) {
          resolve(user.uid);
        } else {
          resolve(null);
        }
      });
    });
  }

  sendEmailInvitation(email: string, docId: string) {
    const actionCodeSettings = {
      url: 'https://main.d9ek0iheftizq.amplifyapp.com/confirm-user?docId=' + docId,
      handleCodeInApp: true // This must be true
    };

    return this.afAuth.sendSignInLinkToEmail(email, actionCodeSettings)
      .then(() => {
        console.log('success sent');        
      })
      .catch(error => {
        console.error('Error sending email invitation: ', error);
      });
  }
 
}