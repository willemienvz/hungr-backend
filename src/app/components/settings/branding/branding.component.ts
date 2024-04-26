import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs';
import { Branding } from '../../../shared/services/branding';

@Component({
  selector: 'app-branding',
  templateUrl: './branding.component.html',
  styleUrl: './branding.component.scss'
})
export class BrandingComponent {
  isSaving: boolean = false; 
  selectedFile: File | null = null;
  imageUrl: string | null = null;
  user: any;
  OwnerID:string='';
  brand: Branding[] = [];
  holdBrand?: Branding;
  isTooltipOpen:boolean = false;
  leftColor:any;

  constructor(private storage: AngularFireStorage, private firestore: AngularFirestore) { }

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('user')!);
    this.OwnerID = this.user.uid;
    this.fetchBranding();
  }

  fetchBranding(){
    this.firestore.collection<Branding>('branding', ref => ref.where('parentID', '==', this.OwnerID))
    .valueChanges()
    .subscribe(brand => {
      this.brand = brand;
    });
  }


  onFileSelected(event:any): void {
    this.selectedFile = event.target.files[0];
  }

  onUpload(): void {
    if (!this.selectedFile) {
      console.error('No file selected');
      return;
    }

    const filePath = `logos/${this.selectedFile.name}`;
    const fileRef = this.storage.ref(filePath);
    const uploadTask = this.storage.upload(filePath, this.selectedFile);

    uploadTask.snapshotChanges().pipe(
      finalize(() => {
        fileRef.getDownloadURL().subscribe(url => {
          if (url) {  
            this.imageUrl = url;
            console.log('Image URL:', this.imageUrl);
            this.saveImageUrl(url);  
          } else {
            console.error('Failed to get download URL');
            this.isSaving = false;
          }
        });
      })
    ).subscribe();
  }

  addBranding(){
    this.holdBrand = {
      parentID:'1',
      btnSecondaryColour:'',
      btnSecondaryLettercase:'',
      btnSecondaryTextColour:'',
      btnSecondaryTypeface:'',
      logo: this.imageUrl ?? '',
      mainHeadingColour:'',
      mainHeadingLettercase:'',
      mainHeadingSize:'',
      mainHeadingTypeface:'',
      subHeadingColour:'',
      subHeadingLettercase:'',
      subHeadingSize:'',
      subHeadingTypeface:'',
      backgroundColour:'',
      bodyColour:'',
      bodyLettercase:'',
      bodySize:'',
      bodyTypeface:'',
      brandingID:'',
      btnPrimaryColour:'',
      btnPrimaryLettercase:'',
      btnPrimaryTextColour:'',
      btnPrimaryTypeface:''
    };
    this.firestore.collection('branding').add(this.holdBrand)
      .then((data) => {
        console.log('Brand added successfully!', data);
        this.holdBrand = {
          parentID:this.OwnerID,
          btnSecondaryColour:'',
          btnSecondaryLettercase:'',
          btnSecondaryTextColour:'',
          btnSecondaryTypeface:'',
          logo:'',
          mainHeadingColour:'',
          mainHeadingLettercase:'',
          mainHeadingSize:'',
          mainHeadingTypeface:'',
          subHeadingColour:'',
          subHeadingLettercase:'',
          subHeadingSize:'',
          subHeadingTypeface:'',
          backgroundColour:'',
          bodyColour:'',
          bodyLettercase:'',
          bodySize:'',
          bodyTypeface:'',
          brandingID:data.id,
          btnPrimaryColour:'',
          btnPrimaryLettercase:'',
          btnPrimaryTextColour:'',
          btnPrimaryTypeface:''
        };
        this.firestore.collection('branding').doc(data.id).update(this.holdBrand);
      })
      .catch(error => {
        console.error('Error adding brand: ', error);
      });
  }

  saveImageUrl(imageUrl: string): void {
    this.firestore.collection('branding').add({ imageUrl})
      .then(() => {
        console.log('Image URL saved to Firestore');
        this.isSaving = false;
      })
      .catch(err => {
        console.error('Error saving image URL to Firestore:', err);
        this.isSaving = false;
      });
  }
  saveAll(){}
}
