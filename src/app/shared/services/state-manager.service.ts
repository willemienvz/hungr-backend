import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AppState {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class StateManagerService {
  private initialState: AppState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  };

  private state$ = new BehaviorSubject<AppState>(this.initialState);

  // Selectors
  selectUser(): Observable<any> {
    return this.state$.asObservable().pipe(
      map(state => state.user)
    );
  }

  selectIsAuthenticated(): Observable<boolean> {
    return this.state$.asObservable().pipe(
      map(state => state.isAuthenticated)
    );
  }

  selectIsLoading(): Observable<boolean> {
    return this.state$.asObservable().pipe(
      map(state => state.isLoading)
    );
  }

  selectError(): Observable<string | null> {
    return this.state$.asObservable().pipe(
      map(state => state.error)
    );
  }

  // Actions
  setUser(user: any): void {
    this.setState({ user });
  }

  setAuthenticated(isAuthenticated: boolean): void {
    this.setState({ isAuthenticated });
  }

  setLoading(isLoading: boolean): void {
    this.setState({ isLoading });
  }

  setError(error: string | null): void {
    this.setState({ error });
  }

  clearError(): void {
    this.setState({ error: null });
  }

  // Private methods
  private setState(partialState: Partial<AppState>): void {
    const currentState = this.state$.value;
    this.state$.next({ ...currentState, ...partialState });
  }

  // Method to reset state (for testing)
  resetState(): void {
    this.state$.next(this.initialState);
  }
}