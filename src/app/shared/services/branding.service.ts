import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { MediaLibraryService } from './media-library.service';
import { Branding } from './branding';

@Injectable({
  providedIn: 'root'
})
export class BrandingService {
  private readonly brandingCollection = 'branding';
  private readonly brandingPreviewCollection = 'branding-preview';

  constructor(
    private firestore: AngularFirestore,
    private mediaLibraryService: MediaLibraryService
  ) {}

  async updateBranding(brandingId: string, updates: any): Promise<void> {
    try {
      await this.firestore.collection(this.brandingCollection).doc(brandingId).update(updates);
    } catch (error) {
      console.error('Error updating branding:', error);
      throw error;
    }
  }

  // Update branding logo with media library reference
  async updateBrandingLogo(brandingId: string, logoMediaId: string): Promise<void> {
    try {
      await this.firestore.collection(this.brandingCollection).doc(brandingId).update({
        logoMediaId: logoMediaId,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating branding logo:', error);
      throw error;
    }
  }

  getBrandingByParentId(parentId: string): Observable<any> {
    return this.firestore
      .collection(this.brandingCollection, ref => ref.where('parentID', '==', parentId))
      .valueChanges({ idField: 'brandingID' });
  }

  // Get branding with media library data
  async getBrandingWithMedia(parentId: string): Promise<Branding[]> {
    try {
      const snapshot = await this.firestore
        .collection(this.brandingCollection, ref => ref.where('parentID', '==', parentId))
        .get()
        .toPromise();

      const branding: Branding[] = [];
      if (snapshot) {
        for (const doc of snapshot.docs) {
          const brand = { brandingID: doc.id, ...doc.data() } as Branding;
          
          // Handle both legacy imageUrl and new logoMediaId
          if (brand.logoMediaId) {
            try {
              brand.logoMediaItem = await this.mediaLibraryService.getMediaById(brand.logoMediaId);
              brand.imageUrl = brand.logoMediaItem?.url; // Maintain backward compatibility
            } catch (error) {
              console.warn(`Failed to load media for branding ${brand.brandingID}:`, error);
            }
          }
          
          branding.push(brand);
        }
      }
      
      return branding;
    } catch (error) {
      console.error('Error getting branding with media:', error);
      throw error;
    }
  }

  // Create branding with media library integration
  async createBranding(branding: any, logoMediaId?: string): Promise<string> {
    try {
      const brandingData = Object.assign({}, branding, {
        logoMediaId: logoMediaId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const docRef = await this.firestore.collection(this.brandingCollection).add(brandingData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating branding:', error);
      throw error;
    }
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