import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Special } from '../../../shared/services/special';
import { MatSnackBar } from '@angular/material/snack-bar';
@Component({
  selector: 'app-specials-landing',
  templateUrl: './specials-landing.component.html',
  styleUrl: './specials-landing.component.scss'
})
export class SpecialsLandingComponent implements OnInit{
  specials: Special[] = [];
  isPopupMenuOpen: boolean[] = [];
  ngOnInit() {
    this.fetchSpecials();
  }
  constructor(
    private firestore: AngularFirestore,
    private snackBar: MatSnackBar
  ){}
  
  private fetchSpecials() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const OwnerID = user.uid;
    this.firestore.collection<Special>('specials', ref => ref.where('OwnerID', '==', OwnerID))
      .valueChanges()
      .subscribe(specials => {
        this.specials = specials;
        console.log(specials);
      });
  }
  onFilterChange(){

  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  deleteSpecial(id:string, index:number){
    this.firestore.doc(`specials/${id}`).delete().then(() => {
      this.fetchSpecials();
      this.togglePopupMenu(index);
    }).catch(error => {
      console.error('Error deleting special: ', error);
    });
    
  }
}
