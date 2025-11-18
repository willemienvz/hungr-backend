import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ChangeSubscriptionData {
  currentAmount?: number;
  currentFrequency?: number;
  currentCycles?: number;
  currentBillingDate?: string;
}

export interface ChangeSubscriptionResult {
  amount?: number;
  frequency?: number;
  cycles?: number;
  run_date?: string;
}

@Component({
  selector: 'app-change-subscription-dialog',
  templateUrl: './change-subscription-dialog.component.html',
  styleUrls: ['./change-subscription-dialog.component.scss']
})
export class ChangeSubscriptionDialogComponent implements OnInit {
  changeForm!: FormGroup;
  isSubmitting: boolean = false;

  frequencyOptions: { value: number; label: string }[] = [
    { value: 3, label: 'Monthly' },
    { value: 4, label: 'Quarterly' },
    { value: 5, label: 'Bi-Annual' },
    { value: 6, label: 'Annual' }
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ChangeSubscriptionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ChangeSubscriptionData
  ) {
    this.changeForm = this.fb.group({
      amount: [null, [Validators.min(1)]],
      frequency: [null],
      cycles: [null, [Validators.min(0)]],
      run_date: [null]
    });
  }

  ngOnInit(): void {
    // Set current values as placeholders if provided
    if (this.data) {
      if (this.data.currentAmount) {
        this.changeForm.get('amount')?.setValue(this.data.currentAmount / 100); // Convert cents to rands
      }
      if (this.data.currentFrequency) {
        this.changeForm.get('frequency')?.setValue(this.data.currentFrequency);
      }
      if (this.data.currentCycles) {
        this.changeForm.get('cycles')?.setValue(this.data.currentCycles);
      }
      if (this.data.currentBillingDate) {
        this.changeForm.get('run_date')?.setValue(this.data.currentBillingDate);
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    // Check if at least one field has a value
    const formValue = this.changeForm.value;
    const hasChanges = (formValue.amount !== null && formValue.amount !== undefined && formValue.amount !== '') || 
                      (formValue.frequency !== null && formValue.frequency !== undefined && formValue.frequency !== '') || 
                      (formValue.cycles !== null && formValue.cycles !== undefined && formValue.cycles !== '') || 
                      (formValue.run_date !== null && formValue.run_date !== undefined && formValue.run_date !== '');

    if (!hasChanges) {
      // Show error - at least one field must be changed
      // Mark all fields as touched to show validation
      Object.keys(this.changeForm.controls).forEach(key => {
        this.changeForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Validate individual fields that have values
    let hasErrors = false;
    Object.keys(this.changeForm.controls).forEach(key => {
      const control = this.changeForm.get(key);
      if (control && (control.value !== null && control.value !== undefined && control.value !== '')) {
        control.markAsTouched();
        if (control.invalid) {
          hasErrors = true;
        }
      }
    });

    if (hasErrors) {
      return;
    }

    // Prepare result data
    const result: ChangeSubscriptionResult = {};

    if (formValue.amount !== null && formValue.amount !== undefined) {
      result.amount = Math.round(formValue.amount * 100); // Convert rands to cents
    }

    if (formValue.frequency !== null && formValue.frequency !== undefined) {
      result.frequency = formValue.frequency;
    }

    if (formValue.cycles !== null && formValue.cycles !== undefined) {
      result.cycles = formValue.cycles;
    }

    if (formValue.run_date !== null && formValue.run_date !== undefined && formValue.run_date !== '') {
      // Format date as YYYY-MM-DD
      // If it's already a string in YYYY-MM-DD format, use it directly
      if (typeof formValue.run_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(formValue.run_date)) {
        result.run_date = formValue.run_date;
      } else {
        // Otherwise, parse and format
        const date = new Date(formValue.run_date);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          result.run_date = `${year}-${month}-${day}`;
        }
      }
    }

    this.dialogRef.close(result);
  }

  getFrequencyLabel(frequency: number): string {
    const option = this.frequencyOptions.find(opt => opt.value === frequency);
    return option ? option.label : `Frequency ${frequency}`;
  }

  getFieldError(fieldName: string): string {
    const field = this.changeForm.get(fieldName);
    if (field && field.invalid && field.touched) {
      if (field.hasError('required')) {
        return `${this.getFieldLabel(fieldName)} is required.`;
      }
      if (field.hasError('min')) {
        return `${this.getFieldLabel(fieldName)} must be greater than ${field.errors?.['min'].min}.`;
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'amount': 'Amount',
      'frequency': 'Frequency',
      'cycles': 'Cycles',
      'run_date': 'Billing Date'
    };
    return labels[fieldName] || fieldName;
  }
}

