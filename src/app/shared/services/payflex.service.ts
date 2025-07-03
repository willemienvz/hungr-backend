import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PayflexService {
  private readonly apiGatewayUrl = 'https://1o6ucfn6n2.execute-api.us-east-1.amazonaws.com/prod1/create-order';
  private paymentSuccessSubject = new Subject<void>();

  constructor(private readonly http: HttpClient) {}

  async createOrder(amount: number, formData: any) {
    const orderData = {
      amount,
      consumer: {
        phoneNumber: formData.cellphone,
        givenNames: formData.firstName,
        surname: formData.lastName,
        email: formData.userEmail
      },
      description: 'Hungr Subscription',
      items: [
        {
          description: 'Hungr Subscription',
          name: 'Hungr Subscription',
          sku: '123456789',
          quantity: 1,
          price: amount
        }
      ],
      merchant: {
        redirectConfirmUrl: 'https://main.d9ek0iheftizq.amplifyapp.com/verify-email-address',
        redirectCancelUrl: 'https://main.d9ek0iheftizq.amplifyapp.com/cancel-payment',
        statusCallbackUrl: 'https://merchantsite.com/callback'
      },
      merchantReference: 'Hungr Subscription' + formData.userEmail,
      taxAmount: 0,
      shippingAmount: 0
    };

    try {
      const response: any = await this.http.post(this.apiGatewayUrl, orderData).toPromise();

      if (response?.redirectUrl) {
        window.location.href = response.redirectUrl;
      }
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  onPaymentSuccess() {
    return this.paymentSuccessSubject.asObservable();
  }

  notifyPaymentSuccess() {
    this.paymentSuccessSubject.next();
  }
}
