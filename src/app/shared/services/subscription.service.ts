import { Injectable } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface PauseSubscriptionResponse {
  success: boolean;
  message?: string;
  data?: {
    subscriptionId: string;
    status: 'paused';
    pausedAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CancelSubscriptionResponse {
  success: boolean;
  message?: string;
  data?: {
    subscriptionId: string;
    status: 'cancelled';
    cancelledAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface UnpauseSubscriptionResponse {
  success: boolean;
  message?: string;
  data?: {
    subscriptionId: string;
    status: 'active';
    resumedAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface UpdateSubscriptionResponse {
  success: boolean;
  message?: string;
  data?: {
    subscriptionId: string;
    status: 'active';
    updatedFields: string[];
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface UpdateSubscriptionData {
  amount?: number;
  frequency?: number;
  cycles?: number;
  run_date?: string;
}

export interface SubscriptionDetailsResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    status: string;
    amount: number;
    frequency: string;
    cycles: string;
    run_date: string | null;
    nextBillingDate: string | null;
    subscriptionId: string;
    plan: string;
    startDate: string | null;
    pausedAt: string | null;
    cancelledAt: string | null;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface Transaction {
  id?: string;
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: string;
  amount_gross: number;
  amount_fee: number;
  amount_net: number;
  email_address: string;
  item_name?: string;
  item_description?: string;
  token?: string;
  created_at?: any;
  updated_at?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  constructor(
    private functions: AngularFireFunctions,
    private firestore: AngularFirestore,
    private authService: AuthService
  ) {}

  pauseSubscription(cycles: number = 1): Promise<PauseSubscriptionResponse> {
    const pauseFn = this.functions.httpsCallable('pauseSubscription');
    return firstValueFrom(pauseFn({ cycles })) as Promise<PauseSubscriptionResponse>;
  }

  cancelSubscription(): Promise<CancelSubscriptionResponse> {
    const cancelFn = this.functions.httpsCallable('cancelSubscription');
    return firstValueFrom(cancelFn({})) as Promise<CancelSubscriptionResponse>;
  }

  unpauseSubscription(): Promise<UnpauseSubscriptionResponse> {
    const unpauseFn = this.functions.httpsCallable('unpauseSubscription');
    return firstValueFrom(unpauseFn({})) as Promise<UnpauseSubscriptionResponse>;
  }

  updateSubscription(updateData: UpdateSubscriptionData): Promise<UpdateSubscriptionResponse> {
    const updateFn = this.functions.httpsCallable('updateSubscription');
    return firstValueFrom(updateFn(updateData)) as Promise<UpdateSubscriptionResponse>;
  }

  getSubscriptionDetails(): Promise<SubscriptionDetailsResponse> {
    const getDetailsFn = this.functions.httpsCallable('getSubscriptionDetails');
    return firstValueFrom(getDetailsFn({})) as Promise<SubscriptionDetailsResponse>;
  }

  getPaymentHistory(limit: number = 10): Observable<Transaction[]> {
    return new Observable<Transaction[]>(observer => {
      // Use Cloud Function to fetch payment history (bypasses security rules)
      const getHistoryFn = this.functions.httpsCallable('getPaymentHistory');
      
      firstValueFrom(getHistoryFn({ limit }))
        .then((response: any) => {
          if (response && response.success && response.data) {
            observer.next(response.data as Transaction[]);
          } else {
            observer.next([]);
          }
          observer.complete();
        })
        .catch(error => {
          console.error('Error fetching payment history:', error);
          observer.next([]);
          observer.complete();
        });
    });
  }
}






