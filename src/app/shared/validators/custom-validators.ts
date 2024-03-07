// Import necessary modules for date validation
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Custom validator for date in the future
export function dateInFutureValidator(): ValidatorFn {
    
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // No validation error if the field is empty
    }
   

    const currentDate = new Date();
    const [month, year] = control.value.split('/').map((part: string) => parseInt(part, 10));

    // Ensure both month and year are valid numbers
    if (isNaN(month) || isNaN(year)) {
      return { 'dateInFuture': true };
    }

    const enteredDate = new Date(2000 + year, month - 1, 1); // Assuming the year is in YY format

    console.log('Entered Date:', enteredDate); // Add this line for debugging

    if (enteredDate < currentDate) {
      return { 'dateInFuture': true }; // Validation error if the date is not in the future
    }

    return null; // No validation error if the date is in the future
  };
}