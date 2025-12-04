import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree,
} from '@angular/router';
import { AuthManagerService } from '../../shared/services/auth-manager.service';
import { Observable, of, timer, race } from 'rxjs';
import { map, first, switchMap, timeout, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(
    private authManager: AuthManagerService,
    private router: Router
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | UrlTree | boolean {
    // Wait for auth to be ready with timeout, then check authentication
    const authReady$ = this.authManager.isAuthReady().pipe(
      first(ready => ready === true)
    );
    
    const timeout$ = timer(3000).pipe(
      map(() => {
        console.warn('AuthGuard: Timeout waiting for auth ready, proceeding with check');
        return true; // Proceed to auth check even if timeout
      })
    );

    return race(authReady$, timeout$).pipe(
      switchMap(() => {
        return this.authManager.isAuthenticated().pipe(
          first(),
          timeout(2000), // 2 second timeout for auth check
          catchError(error => {
            console.error('AuthGuard: Error checking authentication:', error);
            // On error, check localStorage directly as fallback
            try {
              const userStr = localStorage.getItem('user');
              if (userStr && userStr !== 'null') {
                const user = JSON.parse(userStr);
                return of(!!(user && user.uid));
              }
            } catch (e) {
              console.error('AuthGuard: Error reading localStorage:', e);
            }
            return of(false);
          })
        );
      }),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          console.log('AuthGuard: User not authenticated, redirecting to sign-in');
          this.router.navigate(['/sign-in']);
          return false;
        }
        return true;
      }),
      timeout(5000), // Overall timeout of 5 seconds
      catchError(error => {
        console.error('AuthGuard: Overall timeout or error:', error);
        // Fallback: check localStorage directly
        try {
          const userStr = localStorage.getItem('user');
          if (userStr && userStr !== 'null') {
            const user = JSON.parse(userStr);
            if (user && user.uid) {
              return of(true);
            }
          }
        } catch (e) {
          console.error('AuthGuard: Error in fallback check:', e);
        }
        this.router.navigate(['/sign-in']);
        return of(false);
      })
    );
  }
}