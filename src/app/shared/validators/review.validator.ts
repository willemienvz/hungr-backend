/**
 * Review Validation Functions
 * 
 * This file contains custom validators for review data validation.
 * These validators ensure data integrity and proper formatting for reviews.
 */

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ReviewStatus } from '../types/review.interface';

/**
 * Validates that a rating is between 1 and 5
 */
export function ratingValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // No validation error if the field is empty
    }

    const rating = Number(control.value);
    
    if (isNaN(rating)) {
      return { 'invalidRating': { value: control.value, message: 'Rating must be a number' } };
    }
    
    if (rating < 1 || rating > 5) {
      return { 'invalidRating': { value: rating, message: 'Rating must be between 1 and 5' } };
    }
    
    if (!Number.isInteger(rating)) {
      return { 'invalidRating': { value: rating, message: 'Rating must be a whole number' } };
    }

    return null;
  };
}

/**
 * Validates customer name format and length
 */
export function customerNameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // No validation error if the field is empty
    }

    const name = control.value.toString().trim();
    
    if (name.length < 2) {
      return { 'invalidCustomerName': { value: name, message: 'Customer name must be at least 2 characters long' } };
    }
    
    if (name.length > 100) {
      return { 'invalidCustomerName': { value: name, message: 'Customer name must be less than 100 characters' } };
    }
    
    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    const validNamePattern = /^[a-zA-Z\s\-']+$/;
    if (!validNamePattern.test(name)) {
      return { 'invalidCustomerName': { value: name, message: 'Customer name contains invalid characters' } };
    }

    return null;
  };
}

/**
 * Validates review message format and length
 */
export function reviewMessageValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // No validation error if the field is empty
    }

    const message = control.value.toString().trim();
    
    if (message.length < 10) {
      return { 'invalidMessage': { value: message, message: 'Review message must be at least 10 characters long' } };
    }
    
    if (message.length > 1000) {
      return { 'invalidMessage': { value: message, message: 'Review message must be less than 1000 characters' } };
    }
    
    // Check for excessive whitespace
    if (/\s{3,}/.test(message)) {
      return { 'invalidMessage': { value: message, message: 'Review message contains excessive whitespace' } };
    }

    return null;
  };
}

/**
 * Validates review status
 */
export function reviewStatusValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // No validation error if the field is empty
    }

    const validStatuses: ReviewStatus[] = ['pending', 'approved', 'rejected'];
    
    if (!validStatuses.includes(control.value)) {
      return { 'invalidStatus': { value: control.value, message: 'Invalid review status' } };
    }

    return null;
  };
}

/**
 * Validates IP address format (basic validation)
 */
export function ipAddressValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // No validation error if the field is empty
    }

    const ip = control.value.toString().trim();
    
    // Basic IPv4 validation
    const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    if (!ipv4Pattern.test(ip)) {
      return { 'invalidIpAddress': { value: ip, message: 'Invalid IP address format' } };
    }

    return null;
  };
}

/**
 * Validates that moderation notes are not too long
 */
export function moderationNotesValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // No validation error if the field is empty
    }

    const notes = control.value.toString().trim();
    
    if (notes.length > 500) {
      return { 'invalidModerationNotes': { value: notes, message: 'Moderation notes must be less than 500 characters' } };
    }

    return null;
  };
}

/**
 * Composite validator for creating a new review
 */
export function createReviewValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const errors: ValidationErrors = {};
    
    // Validate customer name
    const customerNameControl = control.get('customerName');
    if (customerNameControl) {
      const customerNameError = customerNameValidator()(customerNameControl);
      if (customerNameError) {
        errors['customerName'] = customerNameError;
      }
    }
    
    // Validate message
    const messageControl = control.get('message');
    if (messageControl) {
      const messageError = reviewMessageValidator()(messageControl);
      if (messageError) {
        errors['message'] = messageError;
      }
    }
    
    // Validate rating
    const ratingControl = control.get('rating');
    if (ratingControl) {
      const ratingError = ratingValidator()(ratingControl);
      if (ratingError) {
        errors['rating'] = ratingError;
      }
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  };
} 