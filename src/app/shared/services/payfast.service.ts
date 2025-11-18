import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject } from 'rxjs';
import * as CryptoJS from 'crypto-js';

export interface PayFastPaymentData {
  amount: number;
  firstName: string;
  lastName: string;
  email: string;
  cellphone: string;
  merchantReference?: string;
  subscriptionType?: '1'; // 1 = subscription
  recurringAmount?: number;
  frequency?: '3'; // 3 = monthly
  cycles?: '0'; // 0 = unlimited
  billingDate?: string;
//  tokenNotificationUrl?: string;
}

export interface PayFastFormData {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  name_first: string;
  name_last: string;
  email_address: string;
  cell_number: string;
  m_payment_id: string;
  amount: string;
  item_name: string;
  item_description: string;
  custom_str1?: string;
  custom_str2?: string;
  custom_str3?: string;
  custom_int1?: string;
  custom_int2?: string;
  custom_int3?: string;
  custom_int4?: string;
  custom_int5?: string;
  custom_float1?: string;
  custom_float2?: string;
  custom_float3?: string;
  custom_float4?: string;
  custom_float5?: string;
  email_confirmation?: string;
  subscription_type?: string;
  recurring_amount?: string;
  frequency?: string;
  cycles?: string;
  billing_date?: string;
  //token_notification_url?: string;
  confirmation_address?: string;
  signature: string;
}

@Injectable({
  providedIn: 'root'
})
export class PayFastService {
  private paymentSuccessSubject = new Subject<void>();
  private paymentFailureSubject = new Subject<string>();

  constructor(private readonly http: HttpClient) {}

  /**
   * Creates a PayFast payment form and submits it
   */
  async createPayment(paymentData: PayFastPaymentData): Promise<void> {
    try {
      const formData = this.generatePaymentForm(paymentData);
      this.submitPaymentForm(formData);
    } catch (error) {
      console.error('Error creating PayFast payment:', error);
      this.paymentFailureSubject.next('Failed to create payment form');
      throw error;
    }
  }

  /**
   * Creates a PayFast recurring payment form and submits it
   */
  async createRecurringPayment(paymentData: PayFastPaymentData): Promise<void> {
    try {
      // Set default recurring billing values
      const recurringPaymentData: PayFastPaymentData = {
        ...paymentData,
        subscriptionType: '1', // 1 = subscription
        recurringAmount: 999, // R999 per month
        frequency: '3', // 3 = monthly
        cycles: '0', // 0 = unlimited
        billingDate: this.formatDate(new Date()),
      //  tokenNotificationUrl: environment.payfast?.notifyUrl
      };

      const formData = this.generateRecurringPaymentForm(recurringPaymentData);
      this.submitPaymentForm(formData);
    } catch (error) {
      console.error('Error creating PayFast recurring payment:', error);
      this.paymentFailureSubject.next('Failed to create recurring payment form');
      throw error;
    }
  }

  /**
   * Generates PayFast payment form data with signature
   */
  public generatePaymentForm(paymentData: PayFastPaymentData): PayFastFormData {
    const config = environment.payfast;
    const merchantReference = paymentData.merchantReference ||
      `Hungr_${paymentData.email}_${Date.now()}`;

    // Create form data with all required PayFast fields
    const formData: PayFastFormData = {
      merchant_id: config.merchantId,
      merchant_key: config.merchantKey,
      return_url: config.returnUrl,
      cancel_url: config.cancelUrl,
      notify_url: config.notifyUrl,
      name_first: paymentData.firstName,
      name_last: paymentData.lastName,
      email_address: paymentData.email,
      cell_number: paymentData.cellphone, // Always include cell_number
      m_payment_id: merchantReference,
      amount: paymentData.amount.toFixed(2),
      item_name: 'Hungr Subscription',
      item_description: 'Monthly subscription to Hungr platform',
      signature: '' // Will be calculated below
    };

    // Generate signature with passphrase
    formData.signature = this.generateSignature(formData, config.passphrase);

    return formData;
  }

  /**
   * Generates PayFast recurring payment form data with signature
   */
  public generateRecurringPaymentForm(paymentData: PayFastPaymentData): PayFastFormData {
    const config = environment.payfast;
    const merchantReference = paymentData.merchantReference ||
      `Hungr_${paymentData.email}_${Date.now()}`;

    // Create form data with all required PayFast fields for recurring billing
    const formData: PayFastFormData = {
      merchant_id: config.merchantId,
      merchant_key: config.merchantKey,
      return_url: config.returnUrl,
      cancel_url: config.cancelUrl,
      notify_url: config.notifyUrl,
      name_first: paymentData.firstName,
      name_last: paymentData.lastName,
      email_address: paymentData.email,
      cell_number: paymentData.cellphone, // Always include cell_number
      m_payment_id: merchantReference,
      amount: paymentData.amount.toFixed(2),
      item_name: 'Hungr Subscription',
      item_description: 'Monthly subscription to Hungr platform',
      subscription_type: paymentData.subscriptionType,
      recurring_amount: paymentData.recurringAmount?.toFixed(2),
      frequency: paymentData.frequency,
      cycles: paymentData.cycles,
      billing_date: paymentData.billingDate,
     // token_notification_url: paymentData.tokenNotificationUrl,
      signature: '' // Will be calculated below
    };

    // Generate signature with passphrase
    formData.signature = this.generateSignature(formData, config.passphrase);

    return formData;
  }

  /**
   * Generates MD5 signature for PayFast
   */
  private generateSignature(formData: PayFastFormData, passphrase: string): string {
    // Create parameter string for signature
    const paramString = this.createParameterString(formData);
    
    // For subscriptions, passphrase is REQUIRED
    let signatureString = paramString;
    if (passphrase && passphrase.trim() !== '') {
      const trimmedPassphrase = passphrase.trim();
      signatureString = paramString + `&passphrase=${this.payfastUrlEncode(trimmedPassphrase)}`;
    } else {
      throw new Error('Passphrase is required for PayFast subscriptions');
    }
    
    // Debug logging
    console.log('PayFast Signature Generation:');
    console.log('Parameter String:', paramString);
    console.log('Full Signature String:', signatureString);
    
    // Generate MD5 hash (lowercase)
    const signature = this.md5(signatureString).toLowerCase();
    console.log('Generated Signature:', signature);
    
    return signature;
  }

  /**
   * Creates parameter string for signature generation
   * Following PayFast documentation - specific order, NOT alphabetical
   * Based on the definitive parameter order from PayFast guide (Table 1)
   */
  public createParameterString(formData: PayFastFormData): string {
    // PayFast requires parameters in specific order (not alphabetical)
    // This is the definitive order from PayFast documentation
    const parameterOrder = [
      'merchant_id',
      'merchant_key',
      'return_url',
      'cancel_url',
      'notify_url',
      'name_first',
      'name_last',
      'email_address',
      'cell_number',
      'm_payment_id',
      'amount',
      'item_name',
      'item_description',
      'custom_int1',
      'custom_int2',
      'custom_int3',
      'custom_int4',
      'custom_int5',
      'custom_str1',
      'custom_str2',
      'custom_str3',
      'custom_str4',
      'custom_str5',
      'email_confirmation',
      'confirmation_address',
      'payment_method',
      'subscription_type',
      'billing_date',
      'recurring_amount',
      'frequency',
      'cycles'
    ];

    const params: string[] = [];
    
    // Add parameters in PayFast's required order
    parameterOrder.forEach(key => {
      if (key !== 'signature') {
        const value = formData[key as keyof PayFastFormData];
        if (value && value.toString().trim() !== '') {
          const trimmedValue = value.toString().trim();
          // Use custom URL encoding that matches PayFast requirements
          params.push(`${key}=${this.payfastUrlEncode(trimmedValue)}`);
        }
      }
    });

    return params.join('&');
  }

  /**
   * Creates parameter string for signature generation (non-recurring)
   * Following PayFast documentation - specific order, NOT alphabetical
   * Based on the definitive parameter order from PayFast guide (Table 1)
   */
  private createStandardParameterString(formData: PayFastFormData): string {
    // PayFast requires parameters in specific order (not alphabetical)
    // This is the definitive order from PayFast documentation
    const parameterOrder = [
      'merchant_id',
      'merchant_key',
      'return_url',
      'cancel_url',
      'notify_url',
      'name_first',
      'name_last',
      'email_address',
      'cell_number',
      'm_payment_id',
      'amount',
      'item_name',
      'item_description',
      'custom_int1',
      'custom_int2',
      'custom_int3',
      'custom_int4',
      'custom_int5',
      'custom_str1',
      'custom_str2',
      'custom_str3',
      'custom_str4',
      'custom_str5',
      'email_confirmation',
      'confirmation_address',
      'payment_method'
    ];

    const params: string[] = [];
    
    // Add parameters in PayFast's required order
    parameterOrder.forEach(key => {
      if (key !== 'signature') {
        const value = formData[key as keyof PayFastFormData];
        if (value && value.toString().trim() !== '') {
          const trimmedValue = value.toString().trim();
          // Use custom URL encoding that matches PayFast requirements
          params.push(`${key}=${this.payfastUrlEncode(trimmedValue)}`);
        }
      }
    });

    return params.join('&');
  }

  /**
   * PayFast-specific URL encoding
   * PayFast requires uppercase encoding for special characters
   */
  private payfastUrlEncode(value: string): string {
    // First encode with standard encodeURIComponent
    let encoded = encodeURIComponent(value).replace(/%20/g, "+");
    
    // Convert all hex characters to uppercase as required by PayFast
    encoded = encoded.replace(/%[0-9a-f]{2}/g, (match) => match.toUpperCase());
    
    return encoded;
  }

  /**
   * MD5 implementation using crypto-js
   */
  private md5(input: string): string {
    return CryptoJS.MD5(input).toString();
  }

  /**
   * Submits the payment form to PayFast
   */
  private submitPaymentForm(formData: PayFastFormData): void {
    const config = environment.payfast;
    const actionUrl = environment.production ? config.productionUrl : config.sandboxUrl;

    console.log('🚀 Submitting form to PayFast:');
    console.log('📍 Action URL:', actionUrl);
    console.log('📋 Form Data:', formData);
    console.log('🔐 Generated Signature:', formData.signature);

    // Create form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = actionUrl;
    form.style.display = 'none';
    form.target = '_blank'; // Open in new tab for testing

    // Add form fields
    Object.keys(formData).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = formData[key as keyof PayFastFormData] || '';
      form.appendChild(input);
      console.log(`📝 Form field: ${key} = ${input.value}`);
    });

    // Log the complete form HTML for debugging
    console.log('📄 Complete Form HTML:', form.outerHTML);

    // Submit form
    document.body.appendChild(form);
    console.log('✅ Form submitted to PayFast');
    form.submit();
    
    // Don't remove immediately to allow form submission
    setTimeout(() => {
      if (document.body.contains(form)) {
        document.body.removeChild(form);
      }
    }, 1000);
  }

  /**
   * Validates PayFast ITN (Instant Transaction Notification)
   */
  validateItn(itnData: any): boolean {
    try {
      const config = environment.payfast;
      const receivedSignature = itnData.signature;
      
      // Remove signature from data for validation
      const { signature, ...dataForValidation } = itnData;
      
      // Generate expected signature
      const paramString = this.createParameterString(dataForValidation);
      const signatureString = paramString + `&passphrase=${this.payfastUrlEncode(config.passphrase)}`;
      const expectedSignature = this.md5(signatureString);
      
      return receivedSignature === expectedSignature;
    } catch (error) {
      console.error('Error validating ITN signature:', error);
      return false;
    }
  }

  /**
   * Observable for payment success events
   */
  onPaymentSuccess() {
    return this.paymentSuccessSubject.asObservable();
  }

  /**
   * Observable for payment failure events
   */
  onPaymentFailure() {
    return this.paymentFailureSubject.asObservable();
  }

  /**
   * Notify payment success
   */
  notifyPaymentSuccess() {
    this.paymentSuccessSubject.next();
  }

  /**
   * Notify payment failure
   */
  notifyPaymentFailure(error: string) {
    this.paymentFailureSubject.next(error);
  }

  /**
   * Formats date for PayFast (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Cancels a subscription using the token
   * @param token The subscription token
   * @param reason Optional reason for cancellation
   */
  async cancelSubscription(token: string, reason?: string): Promise<boolean> {
    try {
      const config = environment.payfast;
      
      // Prepare adhoc request data
      const request = {
        merchant_id: config.merchantId,
        merchant_key: config.merchantKey,
        version: 'v1',
        timestamp: new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14),
        token: token,
        signature: '' // Will be calculated below
      };

      // Generate signature
      const signatureData = {
        merchant_id: request.merchant_id,
        merchant_key: request.merchant_key,
        version: request.version,
        timestamp: request.timestamp,
        token: request.token
      };

      const paramString = this.createAdhocParameterString(signatureData);
      request.signature = this.md5(paramString + `&passphrase=${this.payfastUrlEncode(config.passphrase)}`).toLowerCase();

      console.log('Cancelling subscription with token:', token);
      console.log('Request data:', request);

      // Make API call to cancel subscription
      const apiUrl = environment.production
        ? `${config.productionUrl}/process`
        : `${config.sandboxUrl}/process`;
      
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const response = await this.http.post(apiUrl, request, { headers }).toPromise();

      console.log('Cancellation response:', response);

      // Return true if cancellation was successful
      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }
  }

  /**
   * Creates parameter string for adhoc requests (alphabetical order)
   */
  private createAdhocParameterString(data: any): string {
    const params: string[] = [];
    
    // Add parameters in alphabetical order for adhoc requests
    Object.keys(data)
      .filter(key => data[key] !== null && data[key] !== undefined && data[key] !== '')
      .sort()
      .forEach(key => {
        params.push(`${key}=${this.payfastUrlEncode(data[key])}`);
      });

    return params.join('&');
  }
}
