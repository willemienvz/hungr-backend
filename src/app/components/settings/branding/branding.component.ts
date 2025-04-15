import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs';
import { Branding } from '../../../shared/services/branding';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-branding',
  templateUrl: './branding.component.html',
  styleUrls: ['./branding.component.scss'],
})
export class BrandingComponent {
  isSaving: boolean = false;
  selectedFile: File | null = null;
  imageUrl: string | null = null;
  user: any;
  OwnerID: string = '';
  brand: Branding[] = [];
  isTooltipOpen: boolean = false;
  lastSavedDocId: string | null = null;
  tooltipOpen: { [key: string]: boolean } = {};
  // Color settings
  backgroundColor: string = '';
  mainHeadingColor: string = '';
  subHeadingColor: string = '';
  bodyColor: string = '';
  buttonColor: string = '';
  buttonTextColor: string = '';
  buttonSecondaryColor: string = '';
  buttonSecondaryTextColor: string = '';

  // Typeface settings
  typefaces: string[] = [
    'Arial',
    'Times New Roman',
    'Verdana',
    'Helvetica',
    'Courier New',
  ];
  mainHeadingTypeface: string = 'Arial';
  subHeadingTypeface: string = 'Arial';
  bodyTypeface: string = 'Arial';
  buttonTypeface: string = 'Arial';
  buttonSecondaryTypeface: string = 'Arial';

  // Font size settings
  fontSizes: string[] = ['Large', 'Medium', 'Small'];
  mainHeadingSize: string = 'Large';
  subHeadingSize: string = 'Medium';
  bodySize: string = 'Small';
  buttonSize: string = 'Medium';
  buttonSecondarySize: string = 'Medium';

  // Letter case settings
  letterCases: any[] = [
    { display: 'ABC', value: 'uppercase' },
    { display: 'Abc', value: 'capitalize' },
    { display: 'abc', value: 'lowercase' },
  ];
  mainHeadingCase: string = 'uppercase';
  subHeadingCase: string = 'capitalize';
  bodyCase: string = 'lowercase';
  buttonCase: string = 'uppercase';
  buttonSecondaryCase: string = 'uppercase';
  showImageUploadModal = false;

  constructor(
    private storage: AngularFireStorage,
    private firestore: AngularFirestore,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('user')!);
    this.OwnerID = this.user.uid;
    this.fetchBranding();
    this.fetchBrandingData();
  }

  openImageUploadModal() {
    this.showImageUploadModal = true;
  }

  closeImageUploadModal() {
    this.showImageUploadModal = false;
  }

  fetchBranding() {
    this.firestore
      .collection<Branding>('branding', (ref) =>
        ref.where('parentID', '==', this.OwnerID)
      )
      .valueChanges()
      .subscribe((brand) => {
        this.brand = brand;
      });
  }
  openTooltip(tooltip: string) {
    this.tooltipOpen[tooltip] = true;
  }

  removeImg() {
    this.imageUrl = '';
  }

  closeTooltip(tooltip: string) {
    this.tooltipOpen[tooltip] = false;
  }
  applyChanges(type: string, value: any): void {
    console.log(`${type} settings updated.`, value);
    switch (type) {
      case 'Background Color':
        this.backgroundColor = value;
        break;
      case 'Main Heading Color':
        this.mainHeadingColor = value;
        break;
      case 'Sub Heading Color':
        this.subHeadingColor = value;
        break;
      case 'Body Color':
        this.bodyColor = value;
        break;
      case 'Button Color':
        this.buttonColor = value;
        break;
      case 'Button Text Color':
        this.buttonTextColor = value;
        break;
      case 'Button Secondary Color':
        this.buttonSecondaryColor = value;
        break;
      case 'Button Secondary Text Color':
        this.buttonSecondaryTextColor = value;
        break;
      case 'Main Heading Typeface':
        this.mainHeadingTypeface = value;
        break;
      case 'Sub Heading Typeface':
        this.subHeadingTypeface = value;
        break;
      case 'Body Typeface':
        this.bodyTypeface = value;
        break;
      case 'Button Typeface':
        this.buttonTypeface = value;
        break;
      case 'Button Secondary Typeface':
        this.buttonSecondaryTypeface = value;
        break;
      case 'Main Heading Size':
        this.mainHeadingSize = value;
        break;
      case 'Sub Heading Size':
        this.subHeadingSize = value;
        break;
      case 'Body Size':
        this.bodySize = value;
        break;
      case 'Main Heading Case':
        this.mainHeadingCase = this.getCase(value);
        break;
      case 'Sub Heading Case':
        this.subHeadingCase = this.getCase(value);
        break;
      case 'Body Case':
        this.bodyCase = this.getCase(value);
        break;
      case 'Button Case':
        this.buttonCase = this.getCase(value);
        break;
      case 'Button Secondary Case':
        this.buttonSecondaryCase = this.getCase(value);
        break;
      default:
        console.warn('Unrecognized setting type');
    }
  }

  getCase(value: string) {
    if (value === 'uppercase') return 'uppercase';
    if (value === 'ABC') return 'uppercase';
    if (value === 'lowercase') return 'lowercase';
    if (value === 'abc') return 'lowercase';
    if (value === 'Abc') return 'capitalize';
    if (value === 'capitalize') return 'capitalize';
    return '';
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];

    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e: any) => {
      img.src = e.target.result;

      img.onload = () => {
        const width = img.width;
        const height = img.height;

        const requiredWidth = 150;
        const requiredHeight = 50;

        if (width === requiredWidth && height === requiredHeight) {
          this.selectedFile = file;
          this.toastr.success('Image dimensions are valid.');
        } else {
          this.toastr.error(
            `Image must be exactly ${requiredWidth}px by ${requiredHeight}px. Your image is ${width}x${height}px.`
          );
          this.selectedFile = null;
        }
      };
    };

    reader.readAsDataURL(file);
  }

  onUpload(): void {
    if (!this.selectedFile) {
      console.error('No file selected');
      return;
    }

    this.isSaving = true;
    const filePath = `logos/${this.selectedFile.name}`;
    const fileRef = this.storage.ref(filePath);
    const uploadTask = this.storage.upload(filePath, this.selectedFile);

    uploadTask
      .snapshotChanges()
      .pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe((url) => {
            if (url) {
              this.imageUrl = url;
              console.log('Image URL:', this.imageUrl);
              this.saveImageUrl(url);
              this.isSaving = false;
              this.closeImageUploadModal();
            } else {
              console.error('Failed to get download URL');
              this.isSaving = false;
            }
          });
        })
      )
      .subscribe();
  }

  saveImageUrl(imageUrl: string): void {
    const brandingData = { imageUrl, parentID: this.OwnerID };

    if (this.lastSavedDocId) {
      this.firestore
        .collection('branding')
        .doc(this.lastSavedDocId)
        .update(brandingData)
        .then(() => console.log('Image URL updated in Firestore'))
        .catch((err) =>
          console.error('Error updating image URL in Firestore:', err)
        );
    } else {
      const brandingRef = this.firestore.collection('branding', (ref) =>
        ref.where('parentID', '==', this.OwnerID)
      );
      brandingRef
        .get()
        .toPromise()
        .then((querySnapshot) => {
          if (!querySnapshot || querySnapshot.empty) {
            this.firestore
              .collection('branding')
              .add(brandingData)
              .then((docRef) => {
                console.log(
                  'Image URL saved to Firestore with new document ID:',
                  docRef.id
                );
                this.lastSavedDocId = docRef.id; // Save this ID for future updates
              })
              .catch((err) =>
                console.error('Error saving image URL to Firestore:', err)
              );
          } else {
            this.lastSavedDocId = querySnapshot.docs[0].id;
            this.firestore
              .collection('branding')
              .doc(this.lastSavedDocId)
              .update(brandingData)
              .then(() =>
                console.log('Image URL updated in existing Firestore document')
              )
              .catch((err) =>
                console.error('Error updating image URL in Firestore:', err)
              );
          }
        })
        .catch((err) => {
          console.error('Error fetching existing branding data:', err);
        });
    }
  }

  saveAll() {
    console.log('All changes saved');
  }

  fetchBrandingData(): void {
    const brandingRef = this.firestore.collection('branding', (ref) =>
      ref.where('parentID', '==', this.OwnerID)
    );
    brandingRef
      .get()
      .toPromise()
      .then((querySnapshot) => {
        if (!querySnapshot || querySnapshot.empty) {
          // Handle the case where there is no existing branding data
          console.log('No existing branding data found.');
          // Optionally, you might initialize default branding settings here
        } else {
          // Safely extract the first document, if it exists
          const brandingDoc = querySnapshot.docs[0];
          if (brandingDoc) {
            const brandingData = brandingDoc.data();
            this.loadBrandingSettings(brandingData);
            this.lastSavedDocId = brandingDoc.id; // Save the document ID for future updates
            console.log('Branding data loaded:', brandingData);
          }
        }
      })
      .catch((error) => {
        console.error('Error fetching branding data:', error);
      });
  }

  getBrandingSettings(): any {
    return {
      backgroundColor: this.backgroundColor,
      mainHeadingColor: this.mainHeadingColor,
      subHeadingColor: this.subHeadingColor,
      bodyColor: this.bodyColor,
      buttonColor: this.buttonColor,
      buttonTextColor: this.buttonTextColor,
      buttonSecondaryColor: this.buttonSecondaryColor,
      buttonSecondaryTextColor: this.buttonSecondaryTextColor,
      mainHeadingTypeface: this.mainHeadingTypeface,
      subHeadingTypeface: this.subHeadingTypeface,
      bodyTypeface: this.bodyTypeface,
      buttonTypeface: this.buttonTypeface,
      buttonSecondaryTypeface: this.buttonSecondaryTypeface,
      mainHeadingSize: this.mainHeadingSize,
      subHeadingSize: this.subHeadingSize,
      bodySize: this.bodySize,
      buttonSize: this.buttonSize,
      buttonSecondarySize: this.buttonSecondarySize,
      mainHeadingCase: this.mainHeadingCase,
      subHeadingCase: this.subHeadingCase,
      bodyCase: this.bodyCase,
      buttonCase: this.buttonCase,
      buttonSecondaryCase: this.buttonSecondaryCase,
      imageUrl: this.imageUrl,
    };
  }
  loadBrandingSettings(brandingData: any): void {
    console.log(brandingData);
    this.backgroundColor = brandingData?.backgroundColor ?? '';
    this.mainHeadingColor = brandingData?.mainHeadingColor ?? '';
    this.subHeadingColor = brandingData?.subHeadingColor ?? '';
    this.bodyColor = brandingData?.bodyColor ?? '';
    this.buttonColor = brandingData?.buttonColor ?? '';
    this.buttonTextColor = brandingData?.buttonTextColor ?? '';
    this.buttonSecondaryColor = brandingData?.buttonSecondaryColor ?? '';
    this.buttonSecondaryTextColor =
      brandingData?.buttonSecondaryTextColor ?? '';
    this.mainHeadingTypeface = brandingData?.mainHeadingTypeface ?? 'Arial';
    this.subHeadingTypeface = brandingData?.subHeadingTypeface ?? 'Arial';
    this.bodyTypeface = brandingData?.bodyTypeface ?? 'Arial';
    this.buttonTypeface = brandingData?.buttonTypeface ?? 'Arial';
    this.buttonSecondaryTypeface =
      brandingData?.buttonSecondaryTypeface ?? 'Arial';
    this.mainHeadingSize = brandingData?.mainHeadingSize ?? 'Large';
    this.subHeadingSize = brandingData?.subHeadingSize ?? 'Medium';
    this.bodySize = brandingData?.bodySize ?? 'Small';
    this.mainHeadingCase = brandingData?.mainHeadingCase ?? 'uppercase';
    this.subHeadingCase = brandingData?.subHeadingCase ?? 'capitalize';
    this.bodyCase = brandingData?.bodyCase ?? 'lowercase';
    this.buttonCase = brandingData?.buttonCase ?? 'uppercase';
    this.buttonSecondaryCase = brandingData?.buttonSecondaryCase ?? 'uppercase';
    this.imageUrl = brandingData?.imageUrl ?? null;
  }
  updateBrandingDetails(): void {
    this.isSaving = true;
    const brandingDetails = this.getBrandingSettings();
    console.log(brandingDetails);
    if (this.lastSavedDocId) {
      this.firestore
        .collection('branding')
        .doc(this.lastSavedDocId)
        .update(brandingDetails)
        .then(() => {
          this.isSaving = false;
          this.toastr.success('Branding successfully updated');
        })
        .catch((err) => {
          this.toastr.error(
            'An error occurred, please try again later or contact admin'
          );
          this.isSaving = false;
        });
    } else {
      const brandingRef = this.firestore.collection('branding', (ref) =>
        ref.where('parentID', '==', this.OwnerID)
      );
      brandingRef
        .get()
        .toPromise()
        .then((querySnapshot) => {
          if (!querySnapshot || querySnapshot.empty) {
            this.firestore
              .collection('branding')
              .add(brandingDetails)
              .then((docRef) => {
                this.toastr.success('Branding successfully updated');
                this.isSaving = false;
                this.lastSavedDocId = docRef.id;
              })
              .catch((err) => {
                this.toastr.error(
                  'An error occurred, please try again later or contact admin'
                );
                this.isSaving = false;
              });
          } else {
            this.lastSavedDocId = querySnapshot.docs[0].id;
            this.firestore
              .collection('branding')
              .doc(this.lastSavedDocId)
              .update(brandingDetails)
              .then(() => {
                this.toastr.success('Branding successfully updated');
                this.isSaving = false;
              })
              .catch((err) => {
                this.toastr.error(
                  'An error occurred, please try again later or contact admin'
                );
                this.isSaving = false;
              });
          }
        })
        .catch((err) => {
          this.toastr.error('Error fetching existing branding data');
        });
    }
  }

  discardChanges(): void {
    if (this.lastSavedDocId) {
      this.firestore
        .collection('branding')
        .doc(this.lastSavedDocId)
        .get()
        .toPromise()
        .then((doc) => {
          if (doc.exists) {
            const brandingData = doc.data();
            this.loadBrandingSettings(brandingData);
            this.toastr.info('Changes discarded');
          }
        })
        .catch((error) => {
          this.toastr.error('Error discarding changes');
          console.error('Discard error:', error);
        });
    } else {
      this.toastr.warning('No saved branding data to discard');
    }
  }
}
