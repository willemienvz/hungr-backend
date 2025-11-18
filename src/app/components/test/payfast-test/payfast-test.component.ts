import { Component } from '@angular/core';
import { PayFastService, PayFastPaymentData } from '../../../shared/services/payfast.service';

@Component({
  selector: 'app-payfast-test',
  template: `
    <div class="test-container">
      <h2>PayFast Integration Test</h2>
      
      <div class="test-section">
        <h3>Test Payment Type</h3>
        <div class="payment-type-selector">
          <mat-radio-group [(ngModel)]="paymentType">
            <mat-radio-button value="once-off">Once-off Payment</mat-radio-button>
            <mat-radio-button value="recurring">Recurring Subscription (R999/month)</mat-radio-button>
          </mat-radio-group>
        </div>
      </div>
      
      <div class="test-section">
        <h3>Test Payment Form Generation</h3>
        <button mat-raised-button color="primary" (click)="testPaymentForm()" [disabled]="isLoading">
          {{ isLoading ? 'Testing...' : 'Test Payment Form' }}
        </button>
        <button mat-raised-button color="accent" (click)="debugFormData()" [disabled]="isLoading" style="margin-left: 10px;">
          Debug Form Data
        </button>
        <div *ngIf="testResult" class="test-result">
          <p><strong>Result:</strong> {{ testResult }}</p>
        </div>
        <div *ngIf="debugData" class="debug-result">
          <h4>Debug Information:</h4>
          <pre>{{ debugData }}</pre>
        </div>
      </div>

      <div class="test-section">
        <h3>Test Data</h3>
        <div class="test-data">
          <p><strong>Amount:</strong> R{{ testAmount }}</p>
          <p><strong>Name:</strong> {{ testData.firstName }} {{ testData.lastName }}</p>
          <p><strong>Email:</strong> {{ testData.email }}</p>
          <p><strong>Phone:</strong> {{ testData.cellphone }}</p>
          <p *ngIf="paymentType === 'recurring'"><strong>Subscription Type:</strong> Monthly Recurring</p>
        </div>
      </div>

      <div class="test-section">
        <h3>Environment Info</h3>
        <div class="env-info">
          <p><strong>Merchant ID:</strong> {{ merchantId }}</p>
          <p><strong>Environment:</strong> {{ environment }}</p>
          <p><strong>PayFast URL:</strong> {{ payfastUrl }}</p>
          <p><strong>Passphrase:</strong> {{ passphrase }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .test-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .test-section {
      margin-bottom: 30px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }
    
    .test-result {
      margin-top: 15px;
      padding: 10px;
      background: #f0f8ff;
      border-radius: 4px;
    }
    
    .debug-result {
      margin-top: 15px;
      padding: 15px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .debug-result pre {
      margin: 0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    
    .test-data, .env-info {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
    }
    
    button {
      margin-right: 10px;
    }
    
    .payment-type-selector {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  `]
})
export class PayFastTestComponent {
  isLoading = false;
  testResult = '';
  debugData = '';
  paymentType: 'once-off' | 'recurring' = 'recurring'; // Default to recurring
  
  testData: PayFastPaymentData = {
    amount: 999, // Default to R999 for recurring
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    cellphone: '0123456789',
    merchantReference: `TEST_${Date.now()}`
  };

  get testAmount() {
    return this.testData.amount;
  }

  get merchantId() {
    return '10013557';
  }

  get environment() {
    return 'Sandbox';
  }

  get payfastUrl() {
    return 'https://sandbox.payfast.co.za/eng/process';
  }
  
  get passphrase() {
    return 'T3st1ngT3st1ng'; // Same as in environment config
  }

  constructor(private payfastService: PayFastService) {}

  async testPaymentForm() {
    this.isLoading = true;
    this.testResult = '';
    this.debugData = '';
    
    try {
      console.log('Testing PayFast payment form generation...');
      console.log('Test data:', this.testData);
      console.log('Payment type:', this.paymentType);
      
      if (this.paymentType === 'recurring') {
        await this.payfastService.createRecurringPayment(this.testData);
        this.testResult = 'Recurring payment form generated successfully! Check browser console for details.';
        console.log('✅ Recurring payment form test completed successfully');
      } else {
        await this.payfastService.createPayment(this.testData);
        this.testResult = 'Payment form generated successfully! Check browser console for details.';
        console.log('✅ Payment form test completed successfully');
      }
      
    } catch (error) {
      this.testResult = `Error: ${error}`;
      console.error('❌ Payment form test failed:', error);
    } finally {
      this.isLoading = false;
    }
  }

  debugFormData() {
    this.debugData = '';
    
    try {
      console.log('🔍 Debugging PayFast form data...');
      
      let formData;
      if (this.paymentType === 'recurring') {
        formData = this.payfastService.generateRecurringPaymentForm(this.testData);
      } else {
        formData = this.payfastService.generatePaymentForm(this.testData);
      }
      
      this.debugData = JSON.stringify(formData, null, 2);
      
      console.log('📋 Generated Form Data:', formData);
      console.log('🔐 Generated Signature:', formData.signature);
      
    } catch (error) {
      this.debugData = `Error generating form data: ${error}`;
      console.error('❌ Debug failed:', error);
    }
  }
}
