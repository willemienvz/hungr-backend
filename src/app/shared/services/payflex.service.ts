import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PayflexService {
  private readonly authUrl = 'https://auth-uat.payflex.co.za/auth/merchant';
  private readonly createOrderUrl = 'https://api.uat.payflex.co.za/order';

  private readonly clientId = 's24rhTxLINDzBaOUURG8AeFR8XdnokhY';
  private readonly clientSecret = 'aXuHkiSTqG0SadGjWJk7j0jQ47urx4HrgeOeQWWfeQ4WVwgXy3WmhO8mg5dtYWJU';

  constructor(private readonly http: HttpClient) {}

  // Step 1: Get Access Token
  async getAccessToken(): Promise<string> {
    const body = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      audience: 'https://auth-production.payflex.co.za',
      grant_type: 'client_credentials'
    };

    try {
      const response = await this.http.post<{ access_token: string }>(this.authUrl, body).toPromise();
      return response.access_token;
    } catch (error) {
      console.error('Error getting token:', error);
      throw error;
    }
  }

  // Step 2: Create Order
  async createOrder(amount: number, formData: any) {
     const token = await this.getAccessToken();

    const orderData = {
      amount,
      consumer: {
        phoneNumber: formData.cellphone,
        givenNames: formData.firstName,
        surname:  formData.lastName,
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
        statusCallbackUrl: "https://merchantsite.com/callback"
      },
      merchantReference: 'Hungr Subscription' + formData.userEmail,
      taxAmount: 0,
      shippingAmount: 0
    };

    try {
      const response: any = await this.http.post(this.createOrderUrl, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      }).toPromise();

      if (response?.redirectUrl) {
        window.location.href = response.redirectUrl; 
      }
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    } 
  }
}
