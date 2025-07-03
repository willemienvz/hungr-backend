import { Component } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-test-auth',
  template: `
    <div class="container mt-5">
      <h2>Auth Testing</h2>
      <div class="row">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Create Test User</h5>
              <button class="btn btn-primary" (click)="createTestUser()" [disabled]="isLoading">
                {{ isLoading ? 'Creating...' : 'Create Test User' }}
              </button>
              <div *ngIf="error" class="alert alert-danger mt-3">
                {{ error }}
              </div>
              <div *ngIf="success" class="alert alert-success mt-3">
                {{ success }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TestAuthComponent {
  isLoading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(
    private auth: AngularFireAuth,
    private router: Router
  ) {}

  async createTestUser() {
    this.isLoading = true;
    this.error = null;
    this.success = null;

    try {
      // Generate a random email to avoid conflicts
      const randomEmail = `test${Math.floor(Math.random() * 10000)}@test.com`;
      const password = 'Test123!';

      // Create the user
      const userCredential = await this.auth.createUserWithEmailAndPassword(randomEmail, password);
      
      if (userCredential.user) {
        // Send verification email
        await userCredential.user.sendEmailVerification();
        this.success = `Test user created with email: ${randomEmail}. Verification email sent.`;
      }
    } catch (error: any) {
      this.error = `Error: ${error.message}`;
      console.error('Auth Error:', error);
    } finally {
      this.isLoading = false;
    }
  }
} 