import { Component } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-branding',
  templateUrl: './branding.component.html',
  styleUrl: './branding.component.scss'
})
export class BrandingComponent {
  isSaving: boolean = false; 
  selectedFile: File | null = null;
  imageUrl: string | null = null;

  constructor(private storage: AngularFireStorage) { }

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
          this.imageUrl = url;
          console.log('Image URL:', this.imageUrl);
        });
      })
    ).subscribe();
  }
  
  saveAll(){}
}
