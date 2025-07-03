import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Special } from './special';

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
    // For now, return mock data that matches the design
    // In a real implementation, this would aggregate data from orders, views, etc.
    return new Observable(observer => {
      observer.next({
        totalSpecialSales: {
          amount: 15430,
          percentage: '+10%'
        },
        specialViews: {
          count: 2341,
          percentage: '+3%'
        },
        topPerformingSpecial: {
          name: 'Weekend Burger Deal',
          performance: 'Best Seller'
        },
        specialsOrdered: {
          count: 892,
          percentage: '+3%'
        }
      });
    });
  }

  // Get specials categorized by status
  getCategorizedSpecials(ownerId: string): Observable<{
    activeSpecials: Special[];
    inactiveSpecials: Special[];
    draftSpecials: Special[];
  }> {
    return this.firestore
      .collection<Special>('specials', ref => ref.where('OwnerID', '==', ownerId))
      .valueChanges()
      .pipe(
        map(allSpecials => {
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