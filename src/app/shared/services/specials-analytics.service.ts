import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
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
    // Read last 7 days of aggregated specials metrics across all specials for this owner
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }

    return new Observable<SpecialsMetrics>(observer => {
      (async () => {
        try {
          let impressions = 0;
          let clicks = 0;
          let added = 0;
          let conversions = 0;

          // Fetch all specials for this owner to get ids
          const specialsSnap = await this.firestore.firestore.collection('specials').where('OwnerID', '==', ownerId).get();
          const specialIds = specialsSnap.docs.map(d => (d.data() as any).specialID).filter(Boolean);

          for (const dateKey of dates) {
            for (const specialId of specialIds) {
              try {
                const snap = await this.firestore.firestore.doc(`analytics-aggregated/${dateKey}/specials/${specialId}`).get();
                if (snap.exists) {
                  const data: any = snap.data();
                  impressions += data?.specialImpressions || 0;
                  clicks += data?.specialClicks || 0;
                  added += data?.specialAddedToOrder || 0;
                  conversions += data?.specialConversions || 0;
                }
              } catch {}
            }
          }

          const topPerformingSpecial = specialsSnap.docs[0]?.data()?.['specialTitle'] || 'N/A';
          observer.next({
            totalSpecialSales: {
              amount: conversions, // Placeholder: use conversions count as proxy or sum value if tracked
              percentage: ''
            },
            specialViews: {
              count: impressions,
              percentage: ''
            },
            topPerformingSpecial: {
              name: topPerformingSpecial,
              performance: 'Best Seller'
            },
            specialsOrdered: {
              count: added,
              percentage: ''
            }
          });
        } catch (e) {
          observer.error(e);
        }
      })();
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