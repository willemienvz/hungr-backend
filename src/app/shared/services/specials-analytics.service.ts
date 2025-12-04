import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Special } from '../../types/special';

export interface SpecialsMetrics {
  totalSpecialSales: {
    amount: number;
    percentage: string;
  };
  specialViews: {
    count: number;
    percentage: string;
  };
  topPerformingSpecial: {
    name: string;
    performance: string;
  };
  specialsOrdered: {
    count: number;
    percentage: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SpecialsAnalyticsService {

  constructor(private firestore: AngularFirestore) { }

  getSpecialsMetrics(ownerId: string): Observable<SpecialsMetrics> {
    // Simplified metrics loading - return default metrics to prevent crashes
    // TODO: Re-implement with proper batching and error handling
    return from(
      (async () => {
        try {
          // Return default metrics for now to prevent crashes
          // The complex analytics loading can be re-implemented later with proper optimization
          return {
            totalSpecialSales: {
              amount: 0,
              percentage: '0%'
            },
            specialViews: {
              count: 0,
              percentage: '0%'
            },
            topPerformingSpecial: {
              name: 'N/A',
              performance: 'N/A'
            },
            specialsOrdered: {
              count: 0,
              percentage: '0%'
            }
          } as SpecialsMetrics;
        } catch (e) {
          console.error('Error loading specials metrics:', e);
          throw e;
        }
      })()
    );
  }

  // Get specials categorized by status
  getCategorizedSpecials(ownerId: string): Observable<{
    activeSpecials: Special[];
    inactiveSpecials: Special[];
    draftSpecials: Special[];
  }> {
    // Use get() instead of valueChanges() to get a one-time snapshot
    // This prevents multiple real-time listeners from being created
    return from(
      this.firestore.firestore
        .collection('specials')
        .where('OwnerID', '==', ownerId)
        .get()
    ).pipe(
      map(querySnapshot => {
        const allSpecials = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          specialID: doc.id
        } as Special));

        const activeSpecials = allSpecials.filter(special => 
          special.active === true && !special.isDraft
        );
        
        const inactiveSpecials = allSpecials.filter(special => 
          special.active === false && !special.isDraft
        );
        
        const draftSpecials = allSpecials.filter(special => 
          special.isDraft === true
        );

        return {
          activeSpecials,
          inactiveSpecials, 
          draftSpecials
        };
      })
    );
  }

  // Toggle special active status
  toggleSpecialStatus(specialId: string, currentStatus: boolean): Promise<void> {
    return this.firestore
      .collection('specials')
      .doc(specialId)
      .update({ active: !currentStatus });
  }

  // Delete special
  deleteSpecial(specialId: string): Promise<void> {
    return this.firestore
      .collection('specials')
      .doc(specialId)
      .delete();
  }
} 