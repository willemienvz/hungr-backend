import { Injectable } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  constructor(private functions: AngularFireFunctions) {}

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
}






