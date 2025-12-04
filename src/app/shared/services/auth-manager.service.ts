import { Injectable, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, BehaviorSubject, of, timeout, EMPTY } from 'rxjs';
import { catchError, take, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthManagerService implements OnDestroy {
  private currentUserId$ = new BehaviorSubject<string | null>(null);
  private isAuthenticated$ = new BehaviorSubject<boolean>(false);
  private authReady$ = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();
  private authInitialized = false;

  constructor(private authService: AuthService, private afAuth: AngularFireAuth) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    if (this.authInitialized) {
      return;
    }
    this.authInitialized = true;

    // First, try to get auth from localStorage immediately for faster initial load
    let hasLocalAuth = false;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'null') {
        const user = JSON.parse(userStr);
        if (user && user.uid) {
          this.currentUserId$.next(user.uid);
          this.isAuthenticated$.next(true);
          this.authReady$.next(true);
          hasLocalAuth = true;
          console.log('AuthManager: Initialized from localStorage');
        }
      }
    } catch (error) {
      console.warn('AuthManager: Error reading from localStorage:', error);
    }

    // Set a timeout to ensure authReady is set even if Firebase never emits
    // This prevents components from hanging indefinitely
    setTimeout(() => {
      if (!this.authReady$.value) {
        console.warn('AuthManager: Setting authReady after timeout (Firebase may not have emitted)');
        this.authReady$.next(true);
      }
    }, 3000); // 3 second fallback timeout

    // Then subscribe to Firebase auth state for real-time updates
    // Use distinctUntilChanged to prevent duplicate emissions
    this.afAuth.authState.pipe(
      distinctUntilChanged((prev, curr) => {
        // Compare by UID to prevent unnecessary updates
        const prevUid = prev?.uid || null;
        const currUid = curr?.uid || null;
        return prevUid === currUid;
      }),
      catchError((error) => {
        console.error('AuthManager: Auth state error:', error);
        // Ensure authReady is set even on error
        if (!this.authReady$.value) {
          this.authReady$.next(true);
        }
        // Fallback to localStorage if Firebase auth fails
        return this.getAuthFromLocalStorage();
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (user) => {
        console.log('AuthManager: Auth state changed', user ? 'User logged in' : 'User logged out');
        if (user && user.uid) {
          this.currentUserId$.next(user.uid);
          this.isAuthenticated$.next(true);
          // Update localStorage
          try {
            localStorage.setItem('user', JSON.stringify(user));
          } catch (e) {
            console.warn('AuthManager: Error writing to localStorage:', e);
          }
        } else {
          this.currentUserId$.next(null);
          this.isAuthenticated$.next(false);
          // Clear localStorage
          try {
            localStorage.setItem('user', 'null');
          } catch (e) {
            console.warn('AuthManager: Error clearing localStorage:', e);
          }
        }
        // Always set authReady when we get a response from Firebase
        if (!this.authReady$.value) {
          this.authReady$.next(true);
        }
      },
      error: (error) => {
        console.error('AuthManager: Error in auth state subscription:', error);
        // Ensure authReady is set even on error
        if (!this.authReady$.value) {
          this.authReady$.next(true);
        }
      }
    });
  }

  private getAuthFromLocalStorage(): Observable<any> {
    return new Observable(observer => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr && userStr !== 'null') {
          const user = JSON.parse(userStr);
          observer.next(user);
        } else {
          observer.next(null);
        }
      } catch (error) {
        observer.next(null);
      }
      observer.complete();
    });
  }

  getCurrentUserId(): Observable<string | null> {
    return this.currentUserId$.asObservable().pipe(
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticated$.asObservable().pipe(
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  isAuthReady(): Observable<boolean> {
    return this.authReady$.asObservable().pipe(
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  // Method to clear auth state (for testing)
  clearAuthState(): void {
    this.currentUserId$.next(null);
    this.isAuthenticated$.next(false);
    this.authReady$.next(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}