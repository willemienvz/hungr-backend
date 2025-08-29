import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function dateRangeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const dateFrom = control.get('dateFrom')?.value;
    const dateTo = control.get('dateTo')?.value;

    return dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo) ? { dateRangeInvalid: true } : null;
  };
}
