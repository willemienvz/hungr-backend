import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SubscriptionService, SubscriptionDetailsResponse, Transaction } from '../../../shared/services/subscription.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { ChangeSubscriptionDialogComponent, ChangeSubscriptionData } from '../general/change-subscription-dialog/change-subscription-dialog.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-billing',
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.scss']
})
export class BillingComponent implements OnInit, OnDestroy {
  subscriptionData: SubscriptionDetailsResponse['data'] | null = null;
  paymentHistory: Transaction[] = [];
  loading: boolean = false;
  loadingHistory: boolean = false;
  error: string | null = null;
  
  // Operation loading states
  isPausing: boolean = false;
  isResuming: boolean = false;
  isEditing: boolean = false;
  isCancelling: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private subscriptionService: SubscriptionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSubscriptionDetails();
    this.loadPaymentHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadSubscriptionDetails(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      const response = await this.subscriptionService.getSubscriptionDetails();
      
      if (response.success && response.data) {
        this.subscriptionData = response.data;
      } else {
        this.error = response.error?.message || 'Failed to load subscription details.';
        this.subscriptionData = null;
      }
    } catch (error: any) {
      console.error('Error loading subscription details:', error);
      this.error = error.message || 'An error occurred while loading subscription details.';
      this.subscriptionData = null;
    } finally {
      this.loading = false;
    }
  }

  loadPaymentHistory(): void {
    this.loadingHistory = true;

    this.subscriptionService
      .getPaymentHistory(20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (transactions) => {
          this.paymentHistory = transactions;
          this.loadingHistory = false;
        },
        error: (error) => {
          console.error('Error loading payment history:', error);
          this.paymentHistory = [];
          this.loadingHistory = false;
        }
      });
  }

  async pauseSubscription(): Promise<void> {
    if (!this.subscriptionData || this.subscriptionData.status !== 'active') {
      this.snackBar.open('No active subscription found', 'Dismiss', { duration: 5000 });
      return;
    }

    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: '400px',
      data: {
        title: 'Pause Subscription',
        message: 'Are you sure you want to pause your subscription? Billing will be paused and menus will be hidden.'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === true) {
        this.isPausing = true;
        try {
          const response = await this.subscriptionService.pauseSubscription(1);
          
          if (response.success) {
            this.snackBar.open('Subscription paused successfully', 'Dismiss', { duration: 5000 });
            await this.loadSubscriptionDetails();
          } else {
            this.snackBar.open(
              response.error?.message || 'Failed to pause subscription. Please try again or contact support.',
              'Dismiss',
              { duration: 5000 }
            );
          }
        } catch (error: any) {
          console.error('Error pausing subscription:', error);
          const errorMessage = error?.message || 'An error occurred while pausing your subscription. Please contact support.';
          this.snackBar.open(errorMessage, 'Dismiss', { duration: 5000 });
        } finally {
          this.isPausing = false;
        }
      }
    });
  }

  async resumeSubscription(): Promise<void> {
    if (!this.subscriptionData || this.subscriptionData.status !== 'paused') {
      this.snackBar.open('No paused subscription found', 'Dismiss', { duration: 5000 });
      return;
    }

    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: '400px',
      data: {
        title: 'Resume Subscription',
        message: 'Are you sure you want to resume your subscription? Billing will resume and menus will become visible again.'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === true) {
        this.isResuming = true;
        try {
          const response = await this.subscriptionService.unpauseSubscription();
          
          if (response.success) {
            this.snackBar.open('Subscription resumed successfully', 'Dismiss', { duration: 5000 });
            await this.loadSubscriptionDetails();
          } else {
            this.snackBar.open(
              response.error?.message || 'Failed to resume subscription. Please try again or contact support.',
              'Dismiss',
              { duration: 5000 }
            );
          }
        } catch (error: any) {
          console.error('Error resuming subscription:', error);
          const errorMessage = error?.message || 'An error occurred while resuming your subscription. Please contact support.';
          this.snackBar.open(errorMessage, 'Dismiss', { duration: 5000 });
        } finally {
          this.isResuming = false;
        }
      }
    });
  }

  async editSubscription(): Promise<void> {
    if (!this.subscriptionData || this.subscriptionData.status !== 'active') {
      this.snackBar.open('No active subscription found. Please resume your subscription first.', 'Dismiss', { duration: 5000 });
      return;
    }

    // Prepare current subscription data for the dialog
    const dialogData: ChangeSubscriptionData = {
      currentAmount: this.subscriptionData.amount || 99900,
      currentFrequency: this.subscriptionData.frequency ? parseInt(this.subscriptionData.frequency) : 3,
      currentCycles: this.subscriptionData.cycles ? parseInt(this.subscriptionData.cycles) : 0,
      currentBillingDate: this.subscriptionData.nextBillingDate || undefined
    };

    const dialogRef = this.dialog.open(ChangeSubscriptionDialogComponent, {
      width: '600px',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        // User submitted the form with changes
        this.isEditing = true;
        try {
          // Convert amount to cents if provided
          if (result.amount !== undefined && result.amount !== null) {
            result.amount = Math.round(result.amount * 100);
          }

          const response = await this.subscriptionService.updateSubscription(result);
          
          if (response.success) {
            const updatedFields = response.data?.updatedFields || [];
            this.snackBar.open(
              `Subscription updated successfully. Changed: ${updatedFields.join(', ')}`,
              'Dismiss',
              { duration: 5000 }
            );
            await this.loadSubscriptionDetails();
          } else {
            this.snackBar.open(
              response.error?.message || 'Failed to update subscription. Please try again or contact support.',
              'Dismiss',
              { duration: 5000 }
            );
          }
        } catch (error: any) {
          console.error('Error updating subscription:', error);
          const errorMessage = error?.message || 'An error occurred while updating your subscription. Please contact support.';
          this.snackBar.open(errorMessage, 'Dismiss', { duration: 5000 });
        } finally {
          this.isEditing = false;
        }
      }
    });
  }

  async cancelSubscription(): Promise<void> {
    if (!this.subscriptionData || (this.subscriptionData.status !== 'active' && this.subscriptionData.status !== 'paused')) {
      this.snackBar.open('No active or paused subscription found', 'Dismiss', { duration: 5000 });
      return;
    }

    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: '400px',
      data: {
        title: 'Cancel Subscription',
        message: 'Are you sure you want to cancel your subscription? This will permanently end your subscription and stop all future billing. You will lose access to all features immediately.'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === true) {
        this.isCancelling = true;
        try {
          const response = await this.subscriptionService.cancelSubscription();

          if (response.success) {
            this.snackBar.open('Subscription cancelled successfully', 'Dismiss', { duration: 5000 });
            await this.loadSubscriptionDetails();
          } else {
            this.snackBar.open(
              response.error?.message || 'Failed to cancel subscription. Please try again or contact support.',
              'Dismiss',
              { duration: 5000 }
            );
          }
        } catch (error: any) {
          console.error('Error cancelling subscription:', error);
          const errorMessage = error?.message || 'An error occurred while cancelling your subscription. Please contact support.';
          this.snackBar.open(errorMessage, 'Dismiss', { duration: 5000 });
        } finally {
          this.isCancelling = false;
        }
      }
    });
  }

  getStatusBadgeClass(): string {
    if (!this.subscriptionData) return 'status-unknown';
    
    switch (this.subscriptionData.status.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'paused':
        return 'status-paused';
      case 'cancelled':
      case 'canceled':
        return 'status-cancelled';
      default:
        return 'status-unknown';
    }
  }

  getStatusLabel(): string {
    if (!this.subscriptionData) return 'Unknown';
    
    switch (this.subscriptionData.status.toLowerCase()) {
      case 'active':
        return 'Active';
      case 'paused':
        return 'Paused';
      case 'cancelled':
      case 'canceled':
        return 'Cancelled';
      default:
        return this.subscriptionData.status;
    }
  }

  formatAmount(amount: number): string {
    // Amount is in cents, convert to rands
    return `R${(amount / 100).toFixed(2)}`;
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-ZA', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  }

  formatPaymentStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  canPause(): boolean {
    return this.subscriptionData?.status === 'active' && !this.isPausing;
  }

  canResume(): boolean {
    return this.subscriptionData?.status === 'paused' && !this.isResuming;
  }

  canEdit(): boolean {
    return this.subscriptionData?.status === 'active' && !this.isEditing;
  }

  canCancel(): boolean {
    return (this.subscriptionData?.status === 'active' || this.subscriptionData?.status === 'paused') && !this.isCancelling;
  }
}

