import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from, map, switchMap } from 'rxjs';
import { Special } from '../../types/special';
import { MediaLibraryService } from './media-library.service';
import { MediaUsage } from '../types/media';

@Injectable({
  providedIn: 'root'
})
export class SpecialsService {
  constructor(
    private firestore: AngularFirestore,
    private mediaLibraryService: MediaLibraryService
  ) {}

  /**
   * Get all specials with media library integration
   */
  getSpecials(): Observable<Special[]> {
    return this.firestore.collection('specials').valueChanges().pipe(
      switchMap((specials: any[]) => {
        // Process each special to include media library data
        const specialsWithMedia = specials.map(async (special) => {
          const processedSpecial = { ...special } as Special;
          
          // Handle both legacy imageUrl and new mediaId
          if (special.mediaId) {
            try {
              const mediaItem = await this.mediaLibraryService.getMediaById(special.mediaId);
              processedSpecial.mediaItem = mediaItem;
              // Maintain backward compatibility
              if (mediaItem?.url) {
                processedSpecial.imageUrl = mediaItem.url;
              }
            } catch (error) {
              console.warn(`Failed to load media for special ${special.specialID}:`, error);
              // Fallback to existing imageUrl if available
              if (!processedSpecial.imageUrl && special.imageUrl) {
                processedSpecial.imageUrl = special.imageUrl;
              }
            }
          } else if (special.imageUrl) {
            // Legacy special with only imageUrl - maintain compatibility
            processedSpecial.imageUrl = special.imageUrl;
          }
          
          return processedSpecial;
        });
        
        return from(Promise.all(specialsWithMedia));
      })
    );
  }

  /**
   * Get a single special by ID with media library integration
   */
  getSpecialById(specialId: string): Observable<Special | null> {
    return this.firestore.collection('specials').doc(specialId).valueChanges().pipe(
      switchMap(async (special: any) => {
        if (!special) return null;
        
        const processedSpecial = { specialID: specialId, ...special } as Special;
        
        // Handle media library integration
        if (special.mediaId) {
          try {
            const mediaItem = await this.mediaLibraryService.getMediaById(special.mediaId);
            processedSpecial.mediaItem = mediaItem;
            if (mediaItem?.url) {
              processedSpecial.imageUrl = mediaItem.url;
            }
          } catch (error) {
            console.warn(`Failed to load media for special ${specialId}:`, error);
            if (!processedSpecial.imageUrl && special.imageUrl) {
              processedSpecial.imageUrl = special.imageUrl;
            }
          }
        } else if (special.imageUrl) {
          processedSpecial.imageUrl = special.imageUrl;
        }
        
        return processedSpecial;
      })
    );
  }

  /**
   * Create a new special with optional media library integration
   */
  createSpecial(specialData: Omit<Special, 'specialID'>, mediaId?: string): Observable<string> {
    const specialToCreate = {
      ...specialData,
      mediaId: mediaId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return from(this.firestore.collection('specials').add(specialToCreate)).pipe(
      map(docRef => {
        // Update the document with the generated ID
        this.firestore.collection('specials').doc(docRef.id).update({
          specialID: docRef.id
        });
        return docRef.id;
      })
    );
  }

  /**
   * Update a special with media library integration
   */
  updateSpecial(specialId: string, updates: Partial<Special>): Observable<void> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    return from(this.firestore.collection('specials').doc(specialId).update(updateData));
  }

  /**
   * Update special image with media library reference
   */
  updateSpecialImage(specialId: string, fieldName: string, mediaId: string): Observable<void> {
    const updateData: any = {
      updatedAt: new Date()
    };

    // Update the appropriate field based on fieldName
    if (fieldName === 'image') {
      updateData.mediaId = mediaId;
    } else {
      updateData[`${fieldName}MediaId`] = mediaId;
    }

    return from(this.firestore.collection('specials').doc(specialId).update(updateData));
  }

  /**
   * Delete a special and clean up media library usage
   */
  deleteSpecial(specialId: string): Observable<void> {
    return this.getSpecialById(specialId).pipe(
      switchMap(async (special) => {
        if (special?.mediaId) {
          // Remove usage tracking for this special
          try {
            await this.mediaLibraryService.removeMediaUsage(special.mediaId, specialId);
          } catch (error) {
            console.warn(`Failed to remove media usage for special ${specialId}:`, error);
          }
        }
        
        // Delete the special
        return this.firestore.collection('specials').doc(specialId).delete();
      })
    );
  }

  /**
   * Track media usage for a special
   */
  trackMediaUsage(mediaId: string, specialId: string, fieldName: string = 'image'): Observable<void> {
    const usage: MediaUsage = {
      componentType: 'special',
      componentId: specialId,
      componentName: 'Special',
      usageDate: new Date(),
      fieldName: fieldName
    };

    return from(this.mediaLibraryService.trackMediaUsage(mediaId, usage));
  }

  /**
   * Migrate existing specials to use media library
   */
  async migrateSpecialsToMediaLibrary(): Promise<void> {
    const specialsSnapshot = await this.firestore.collection('specials').get().toPromise();
    
    for (const doc of specialsSnapshot!.docs) {
      const special = doc.data() as Special;
      
      // Only migrate if special has imageUrl but no mediaId
      if (special.imageUrl && !special.mediaId) {
        try {
          // Create media item from existing image URL
          const mediaItem = await this.createMediaFromUrl(special.imageUrl, special.specialTitle);
          
          // Update special with media library reference
          await this.firestore.collection('specials').doc(doc.id).update({
            mediaId: mediaItem.id,
            updatedAt: new Date()
          });
          
          console.log(`Migrated special ${special.specialID} to media library`);
        } catch (error) {
          console.error(`Failed to migrate special ${special.specialID}:`, error);
        }
      }
    }
  }

  /**
   * Create media item from existing URL (placeholder implementation)
   */
  private async createMediaFromUrl(imageUrl: string, specialName: string): Promise<any> {
    // This is a placeholder implementation
    // In a real scenario, you would:
    // 1. Download the image from the URL
    // 2. Upload it to Firebase Storage
    // 3. Create a media item in the media library
    // 4. Return the media item
    
    throw new Error('Migration from URL not implemented - requires image download and re-upload');
  }

  /**
   * Get specials by status (active, draft, etc.)
   */
  getSpecialsByStatus(status: 'active' | 'draft' | 'all' = 'all'): Observable<Special[]> {
    let query = this.firestore.collection('specials');
    
    if (status !== 'all') {
      query = this.firestore.collection('specials', ref => ref.where('active', '==', status === 'active'));
    }
    
    return query.valueChanges().pipe(
      switchMap((specials: any[]) => {
        const specialsWithMedia = specials.map(async (special) => {
          const processedSpecial = { ...special } as Special;
          
          if (special.mediaId) {
            try {
              const mediaItem = await this.mediaLibraryService.getMediaById(special.mediaId);
              processedSpecial.mediaItem = mediaItem;
              if (mediaItem?.url) {
                processedSpecial.imageUrl = mediaItem.url;
              }
            } catch (error) {
              console.warn(`Failed to load media for special ${special.specialID}:`, error);
              if (!processedSpecial.imageUrl && special.imageUrl) {
                processedSpecial.imageUrl = special.imageUrl;
              }
            }
          } else if (special.imageUrl) {
            processedSpecial.imageUrl = special.imageUrl;
          }
          
          return processedSpecial;
        });
        
        return from(Promise.all(specialsWithMedia));
      })
    );
  }
} 