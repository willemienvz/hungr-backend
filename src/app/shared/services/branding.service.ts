import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BrandingService {
  private readonly brandingCollection = 'branding';
  private readonly brandingPreviewCollection = 'branding-preview';

  constructor(private firestore: AngularFirestore) {}

  async updateBranding(brandingId: string, updates: any): Promise<void> {
    try {
      await this.firestore.collection(this.brandingCollection).doc(brandingId).update(updates);
    } catch (error) {
      console.error('Error updating branding:', error);
      throw error;
    }
  }

  getBrandingByParentId(parentId: string): Observable<any> {
    return this.firestore
      .collection(this.brandingCollection, ref => ref.where('parentID', '==', parentId))
      .valueChanges({ idField: 'brandingID' });
  }

  async savePreviewSettings(parentId: string, previewData: any): Promise<void> {
    try {
      const previewRef = this.firestore.collection(this.brandingPreviewCollection);
      await previewRef.add({
        ...previewData,
        parentID: parentId,
        previewTimestamp: Date.now()
      });
    } catch (error) {
      console.error('Error saving preview settings:', error);
      throw error;
    }
  }
} 