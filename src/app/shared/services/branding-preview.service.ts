import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Branding } from './branding';

@Injectable({
  providedIn: 'root'
})
export class BrandingPreviewService {

  constructor(private firestore: AngularFirestore) { }

  /**
   * Get realtime branding settings for a restaurant
   * This will return preview settings if they exist, otherwise default settings
   */
  getBrandingSettings(restaurantId: string): Observable<Branding | null> {
    return new Observable(observer => {
      // First, check for preview settings
      const previewUnsub = this.firestore
        .collection<Branding>('branding-preview', ref => 
          ref.where('parentID', '==', restaurantId)
             .orderBy('previewTimestamp', 'desc')
             .limit(1)
        )
        .valueChanges()
        .subscribe(previewData => {
          if (previewData && previewData.length > 0) {
            // Preview settings exist, use them
            console.log('Using preview settings:', previewData[0]);
            observer.next(previewData[0]);
          } else {
            // No preview settings, fall back to default
            const defaultUnsub = this.firestore
              .collection<Branding>('branding', ref => 
                ref.where('parentID', '==', restaurantId)
              )
              .valueChanges()
              .subscribe(defaultData => {
                if (defaultData && defaultData.length > 0) {
                  console.log('Using default settings:', defaultData[0]);
                  observer.next(defaultData[0]);
                } else {
                  observer.next(null);
                }
              });

            // Clean up default subscription when preview subscription ends
            return () => defaultUnsub.unsubscribe();
          }
        });

      // Return cleanup function
      return () => previewUnsub.unsubscribe();
    });
  }

  /**
   * Check if preview mode is active for a restaurant
   */
  isPreviewModeActive(restaurantId: string): Observable<boolean> {
    return new Observable(observer => {
      const unsub = this.firestore
        .collection<Branding>('branding-preview', ref => 
          ref.where('parentID', '==', restaurantId)
        )
        .valueChanges()
        .subscribe(previewData => {
          observer.next(previewData && previewData.length > 0);
        });

      return () => unsub.unsubscribe();
    });
  }

  /**
   * Get preview settings specifically (used for comparison)
   */
  getPreviewSettings(restaurantId: string): Observable<Branding[]> {
    return this.firestore
      .collection<Branding>('branding-preview', ref => 
        ref.where('parentID', '==', restaurantId)
           .orderBy('previewTimestamp', 'desc')
      )
      .valueChanges();
  }

  /**
   * Get default/published settings
   */
  getDefaultSettings(restaurantId: string): Observable<Branding[]> {
    return this.firestore
      .collection<Branding>('branding', ref => 
        ref.where('parentID', '==', restaurantId)
      )
      .valueChanges();
  }

  /**
   * Clean up old preview settings (useful for cleanup tasks)
   */
  cleanupOldPreviewSettings(olderThanMinutes: number = 60): void {
    const cutoffTime = Date.now() - (olderThanMinutes * 60 * 1000);
    
    this.firestore
      .collection('branding-preview', ref => 
        ref.where('previewTimestamp', '<', cutoffTime)
      )
      .get()
      .toPromise()
      .then(querySnapshot => {
        if (querySnapshot && !querySnapshot.empty) {
          const batch = this.firestore.firestore.batch();
          querySnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          return batch.commit();
        }
        return Promise.resolve();
      })
      .then(() => {
        console.log('Old preview settings cleaned up');
      })
      .catch(error => {
        console.error('Error cleaning up old preview settings:', error);
      });
  }
} 