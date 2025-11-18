import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PayFastService } from '../../../shared/services/payfast.service';

@Component({
  selector: 'app-payment-cancel',
  templateUrl: './payment-cancel.component.html',
  styleUrl: './payment-cancel.component.scss'
})
export class PaymentCancelComponent implements OnInit {
  paymentId: string | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private payfastService: PayFastService
  ) {}

  ngOnInit(): void {
    // Get payment ID from query parameters
    this.route.queryParams.subscribe(params => {
      this.paymentId = params['m_payment_id'] || null;
      this.isLoading = false;
    });

    // Notify payment failure
    this.payfastService.notifyPaymentFailure('Payment was cancelled by user');
  }

  retryPayment(): void {
    this.router.navigate(['/register-user/step2']);
  }

  goToSignUp(): void {
    this.router.navigate(['/register-user/step1']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}




