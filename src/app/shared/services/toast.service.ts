import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

/**
 * Unified Toast Service
 * Provides a consistent API for showing toast notifications throughout the application.
 * Wraps Angular Material's MatSnackBar with a ToastrService-like API for easy migration.
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly defaultConfig: MatSnackBarConfig = {
    duration: 3000,
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
    panelClass: ['hungr-snackbar']
  };

  constructor(private snackBar: MatSnackBar) {}

  /**
   * Show a success toast notification
   */
  success(message: string, title?: string, config?: MatSnackBarConfig): void {
    const displayMessage = title ? `${title}: ${message}` : message;
    this.snackBar.open(displayMessage, '×', {
      ...this.defaultConfig,
      ...config
    });
  }

  /**
   * Show an error toast notification
   */
  error(message: string, title?: string, config?: MatSnackBarConfig): void {
    const displayMessage = title ? `${title}: ${message}` : message;
    this.snackBar.open(displayMessage, '×', {
      ...this.defaultConfig,
      duration: 5000, // Errors stay longer
      ...config
    });
  }

  /**
   * Show a warning toast notification
   */
  warning(message: string, title?: string, config?: MatSnackBarConfig): void {
    const displayMessage = title ? `${title}: ${message}` : message;
    this.snackBar.open(displayMessage, '×', {
      ...this.defaultConfig,
      ...config
    });
  }

  /**
   * Show an info toast notification
   */
  info(message: string, title?: string, config?: MatSnackBarConfig): void {
    const displayMessage = title ? `${title}: ${message}` : message;
    this.snackBar.open(displayMessage, '×', {
      ...this.defaultConfig,
      ...config
    });
  }

  /**
   * Show a custom toast notification
   */
  show(message: string, action: string = '×', config?: MatSnackBarConfig): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      ...config
    });
  }
}

