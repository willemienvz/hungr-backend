import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MobileMenuService {
  private isMobileMenuOpenSubject = new BehaviorSubject<boolean>(false);
  public isMobileMenuOpen$ = this.isMobileMenuOpenSubject.asObservable();

  constructor() { }

  toggleMobileMenu(): void {
    this.isMobileMenuOpenSubject.next(!this.isMobileMenuOpenSubject.value);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpenSubject.next(false);
  }

  openMobileMenu(): void {
    this.isMobileMenuOpenSubject.next(true);
  }

  get isMobileMenuOpen(): boolean {
    return this.isMobileMenuOpenSubject.value;
  }
}

