import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function timeRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const timeFrom = control.get('timeFrom')?.value;
      const timeTo = control.get('timeTo')?.value;
  
      return timeFrom && timeTo && timeFrom > timeTo ? { timeRangeInvalid: true } : null;
    };
  }
  