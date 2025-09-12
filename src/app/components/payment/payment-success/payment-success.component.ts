import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PayFastService } from '../../../shared/services/payfast.service';

@Component({
  selector: 'app-payment-success',
  templateUrl: './payment-success.component.html',
  styleUrl: './payment-success.component.scss'
})
export class PaymentSuccessComponent implements OnInit {
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

    // Notify payment success
    this.payfastService.notifyPaymentSuccess();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}




