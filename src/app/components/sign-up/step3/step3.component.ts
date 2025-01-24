import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-step3',
  templateUrl: './step3.component.html',
  styleUrls: ['./step3.component.scss']
})
export class Step3Component implements OnInit {
  step3Form: FormGroup;
  @Output() finish: EventEmitter<any> = new EventEmitter<any>();
  @Output() skip: EventEmitter<void> = new EventEmitter<void>();

  constructor(private fb: FormBuilder, private toastr: ToastrService) {
    this.step3Form = this.fb.group({
      cardHolderName: [''],
      cardNumber: ['', Validators.pattern(/^\d{4} \d{4} \d{4} \d{4}$/)],
      cvv: ['',  Validators.pattern(/^\d{3}$/)],
      expiryDate: ['',  Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)],
    });
  }

  ngOnInit(): void {}

  get cardHolderName(): AbstractControl | null {
    return this.step3Form.get('cardHolderName');
  }

  get cardNumber(): AbstractControl | null {
    return this.step3Form.get('cardNumber');
  }

  get cvv(): AbstractControl | null {
    return this.step3Form.get('cvv');
  }

  get expiryDate(): AbstractControl | null {
    return this.step3Form.get('expiryDate');
  }

  onFinish(): void {
    if (this.step3Form.valid) {
      this.finish.emit(this.step3Form.value);
    } else {
      this.toastr.error('Please fill in all required fields correctly.');
    }
  }

  onSkip(): void {
    this.skip.emit();
  }
}
