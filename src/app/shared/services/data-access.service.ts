import { Injectable } from '@angular/core';
import { AngularFirestore, DocumentReference } from '@angular/fire/compat/firestore';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, shareReplay, tap, take, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { AuthManagerService } from './auth-manager.service';

@Injectable({
  providedIn: 'root'
})
export class DataAccessService {
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(
    private afs: AngularFirestore,
    private authManager: AuthManagerService
  ) {}

  // Generic document getter with caching
  getDocument<T>(path: string, useCache = true): Observable<T | null> {
    if (useCache && this.isCacheValid(path)) {
      return of(this.cache.get(path));
    }

    return this.afs.doc<T>(path).valueChanges().pipe(
      distinctUntilChanged((prev, curr) => {
        // Only emit if data actually changed
        return JSON.stringify(prev) === JSON.stringify(curr);
      }),
      tap(data => {
        if (useCache) {
          this.setCache(path, data);
        }
      }),
      map(data => data || null),
      shareReplay(1), // Share the subscription to prevent multiple subscriptions
      catchError(error => {
        console.error(`Error fetching document ${path}:`, error);
        return of(null);
      })
    );
  }

  // Generic collection getter with caching
  getCollection<T>(path: string, useCache = true): Observable<T[]> {
    if (useCache && this.isCacheValid(path)) {
      return of(this.cache.get(path));
    }

    return this.afs.collection<T>(path).valueChanges().pipe(
      distinctUntilChanged((prev, curr) => {
        // Only emit if data actually changed
        if (!prev || !curr) return false;
        if (prev.length !== curr.length) return false;
        // Compare by JSON string of sorted IDs if objects have IDs
        try {
          const prevIds = prev.map((item: any) => item.id || JSON.stringify(item)).sort().join('|');
          const currIds = curr.map((item: any) => item.id || JSON.stringify(item)).sort().join('|');
          return prevIds === currIds;
        } catch {
          // Fallback to full comparison if IDs aren't available
          return JSON.stringify(prev) === JSON.stringify(curr);
        }
      }),
      tap(data => {
        if (useCache) {
          this.setCache(path, data);
        }
      }),
      shareReplay(1), // Share the subscription to prevent multiple subscriptions
      catchError(error => {
        console.error(`Error fetching collection ${path}:`, error);
        return of([]);
      })
    );
  }

  // Specialized methods for our specific use cases

  // Get restaurant data with caching
  getRestaurantData(restaurantId: string): Observable<any> {
    return this.getDocument(`restaurants/${restaurantId}`);
  }

  // Get specials for a restaurant with caching
  getSpecials(restaurantId: string): Observable<any[]> {
    const path = `restaurants/${restaurantId}/specials`;
    return this.getCollection(path);
  }

  // Get reviews for a restaurant with optimized queries
  getReviews(restaurantId: string, options?: {
    limit?: number;
    orderBy?: string;
    direction?: 'asc' | 'desc';
    startAfter?: any;
    status?: 'pending' | 'approved' | 'rejected';
  }): Observable<any[]> {
    let query = this.afs.collection(
      `restaurants/${restaurantId}/reviews`,
      ref => {
        let q: any = ref;
        
        if (options?.status) {
          q = q.where('status', '==', options.status);
        }
        
        if (options?.orderBy) {
          q = q.orderBy(options.orderBy, options.direction || 'desc');
        }
        
        if (options?.startAfter) {
          q = q.startAfter(options.startAfter);
        }
        
        if (options?.limit) {
          q = q.limit(options.limit);
        }
        
        return q;
      }
    );

    return query.valueChanges().pipe(
      catchError(error => {
        console.error('Error fetching reviews:', error);
        return of([]);
      })
    );
  }

  // Batch get user data for multiple reviews
  getUsersBatch(userIds: string[]): Observable<{ [userId: string]: any }> {
    if (!userIds || userIds.length === 0) {
      return of({});
    }

    // Create unique cache key for this batch
    const cacheKey = `users_batch_${userIds.sort().join('_')}`;
    
    if (this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey));
    }

    // Batch all user requests
    const userObservables = userIds.map(userId => 
      this.getDocument(`users/${userId}`).pipe(
        map(user => ({ userId, user }))
      )
    );

    // Use forkJoin to wait for all user data
    return new Observable<{ [userId: string]: any }>(observer => {
      let completedCount = 0;
      const result: { [userId: string]: any } = {};

      userObservables.forEach(obs => {
        obs.subscribe(
          ({ userId, user }) => {
            result[userId] = user;
            completedCount++;
            
            if (completedCount === userIds.length) {
              this.setCache(cacheKey, result);
              observer.next(result);
              observer.complete();
            }
          },
          error => {
            console.error(`Error fetching user data:`, error);
            completedCount++;
            
            if (completedCount === userIds.length) {
              this.setCache(cacheKey, result);
              observer.next(result);
              observer.complete();
            }
          }
        );
      });
    });
  }

  // Update document with error handling
  updateDocument(path: string, data: any): Observable<void> {
    return new Observable<void>(observer => {
      this.afs.doc(path).update(data)
        .then(() => {
          this.invalidateCache(path);
          observer.next();
          observer.complete();
        })
        .catch(error => {
          console.error(`Error updating document ${path}:`, error);
          observer.error(error);
        });
    });
  }

  // Create document with error handling
  createDocument(path: string, data: any): Observable<DocumentReference> {
    return new Observable<DocumentReference>(observer => {
      this.afs.collection(path.substring(0, path.lastIndexOf('/'))).add(data)
        .then(docRef => {
          // Invalidate collection cache
          const collectionPath = path.substring(0, path.lastIndexOf('/'));
          this.invalidateCache(collectionPath);
          observer.next(docRef);
          observer.complete();
        })
        .catch(error => {
          console.error(`Error creating document in ${path}:`, error);
          observer.error(error);
        });
    });
  }

  // Delete document with error handling
  deleteDocument(path: string): Observable<void> {
    return new Observable<void>(observer => {
      this.afs.doc(path).delete()
        .then(() => {
          this.invalidateCache(path);
          observer.next();
          observer.complete();
        })
        .catch(error => {
          console.error(`Error deleting document ${path}:`, error);
          observer.error(error);
        });
    });
  }

  // Cache management methods
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry !== undefined && Date.now() < expiry && this.cache.has(key);
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  private invalidateCache(key: string): void {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
    
    // Also invalidate any related cache entries
    const keysToDelete: string[] = [];
    this.cache.forEach((value, cacheKey) => {
      if (cacheKey.includes(key)) {
        keysToDelete.push(cacheKey);
      }
    });
    
    keysToDelete.forEach(k => {
      this.cache.delete(k);
      this.cacheExpiry.delete(k);
    });
  }

  // Clear all cache (for testing or logout)
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  // Get current restaurant ID safely
  getCurrentRestaurantId(): Observable<string | null> {
    return this.authManager.getCurrentUserId().pipe(
      switchMap(userId => {
        if (!userId) {
          return of(null);
        }
        // Get user data to find restaurant ID
        return this.getDocument(`users/${userId}`).pipe(
          map((userData: any) => {
            return userData?.restaurantId || userId; // Fallback to userId if no restaurantId
          }),
          catchError(error => {
            console.error('Error getting restaurant ID:', error);
            return of(userId); // Fallback to userId
          })
        );
      }),
      take(1),
      catchError(error => {
        console.error('Error getting restaurant ID:', error);
        return of(null);
      })
    );
  }
}