import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private readonly firebaseFunctionUrl =
    'https://us-central1-hungr-firebase.cloudfunctions.net/sendBrevoEmail';
  private readonly lambdaUrl =
    'https://2xajnvt3eg.execute-api.us-east-1.amazonaws.com/default/sendEmail';

  constructor(private readonly http: HttpClient) {}

  /*  sendConfirmationEmail(email: string, name: string) {
    return this.http.post(this.firebaseFunctionUrl, {
      email,
      name,
    });
  } */

  sendConfirmationEmail(email: string, name: string) {
    console.log('test');
    return this.http.post(this.lambdaUrl, {
      email,
      name,
    });
  }
}
