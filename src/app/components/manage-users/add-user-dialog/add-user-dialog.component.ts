import { Component } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { NgForm } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';
import { PermissionService } from '../../../shared/services/permission.service';
import { EmailService, InvitationEmailData } from '../../../shared/services/email.service';
import { UserRole, UserPermissions } from '../../../shared/services/user';
import firebase from 'firebase/compat/app';

@Component({
  selector: 'app-add-user-dialog',
  templateUrl: './add-user-dialog.component.html',
  styleUrl: './add-user-dialog.component.scss',
})
export class AddUserDialogComponent {
  showPopup: boolean = false;
  isSaving: boolean = false;

  // Role and permission properties
  availableRoles: UserRole[] = ['admin', 'editor', 'viewer', 'custom'];
  selectedRole: UserRole = 'editor';
  customPermissions: UserPermissions = {
    viewAnalytics: false,
    createMenus: false,
    editMenus: false,
    editRestaurants: false,
    addSpecials: false,
    editBranding: false,
    manageUsers: false
  };
  showCustomPermissions: boolean = false;

  constructor(
    public authService: AuthService,
    private readonly toast: ToastService,
    private permissionService: PermissionService,
    private emailService: EmailService
  ) { }

  openPopup() {
    this.showPopup = true;
    this.resetForm();
  }

  closePopup() {
    this.showPopup = false;
    this.resetForm();
  }

  private resetForm() {
    this.selectedRole = 'editor';
    this.customPermissions = {
      viewAnalytics: false,
      createMenus: false,
      editMenus: false,
      editRestaurants: false,
      addSpecials: false,
      editBranding: false,
      manageUsers: false
    };
    this.showCustomPermissions = false;
  }

  addUser(userForm: NgForm) {
    this.isSaving = true;

    if (userForm.valid) {
      const userData = userForm.value;

      // Add role and permissions to user data
      userData.role = this.selectedRole;
      userData.permissions = this.selectedRole === 'custom'
        ? this.customPermissions
        : this.permissionService.getPermissionsForRole(this.selectedRole);

      // For now, create invitation instead of direct signup
      this.sendInvitation(userData);
    }
  }

  public sendInvitation(userData: any) {
    // Generate a secure invitation token
    const invitationToken = this.generateInvitationToken();

    // Prepare invitation data for email
    const invitationData: InvitationEmailData = {
      email: userData.email,
      firstName: userData.name,
      lastName: userData.lastname,
      role: userData.role,
      invitationToken: invitationToken,
      invitedBy: this.getCurrentUserName(),
      restaurantName: this.getRestaurantName()
    };

    // Send invitation email
    this.emailService.sendInvitationEmail(invitationData).subscribe({
      next: (response) => {
        console.log('Invitation email sent successfully:', response);
        this.toast.success('Invitation sent successfully!');

        // Store invitation data in Firestore
        this.storeInvitationData(userData, invitationToken);

        this.closePopup();
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Failed to send invitation email:', error);
        this.toast.error('Failed to send invitation. Please try again.');

        // Fallback: still create the user but mark as pending
        this.createPendingUser(userData, invitationToken);
        this.isSaving = false;
      }
    });
  }

  private generateInvitationToken(): string {
    // Generate a secure random token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private getCurrentUserName(): string {
    // Get current user's name from localStorage or auth service
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.email || 'Admin';
  }

  private getRestaurantName(): string {
    // Get restaurant name from localStorage or settings
    // For now, return a default name
    return 'Hungr Restaurant';
  }

  private storeInvitationData(userData: any, invitationToken: string) {
    // TODO: Store invitation data in Firestore invitations collection
    // This would include the token, expiry date, user data, etc.
    console.log('Storing invitation data:', { userData, invitationToken });
  }

  private createPendingUser(userData: any, invitationToken: string) {
    // Create user record with pending status
    const pendingUserData = {
      ...userData,
      invitationToken,
      invitationAccepted: false,
      invitedAt: new Date(),
      invitedBy: this.getCurrentUserName()
    };

    // TODO: Store in Firestore with pending status
    console.log('Creating pending user:', pendingUserData);
  }

  onRoleChange(role: UserRole) {
    this.selectedRole = role;
    this.showCustomPermissions = role === 'custom';

    if (role !== 'custom') {
      // Update custom permissions to match the selected role
      this.customPermissions = { ...this.permissionService.getPermissionsForRole(role) };
    }
  }

  getRoleDisplayName(role: UserRole): string {
    return this.permissionService.getRoleDisplayName(role);
  }

  getRoleDescription(role: UserRole): string {
    return this.permissionService.getRoleDescription(role);
  }

  getPermissionLabels(): Record<keyof UserPermissions, string> {
    return this.permissionService.getPermissionLabels();
  }

  getAllPermissions(): (keyof UserPermissions)[] {
    return this.permissionService.getAllPermissions();
  }

  updateCustomPermission(permission: keyof UserPermissions, value: boolean) {
    this.customPermissions[permission] = value;
  }

  /**
   * Handle checkbox change event for custom permissions
   */
  onPermissionChange(event: Event, permission: keyof UserPermissions) {
    const target = event.target as HTMLInputElement;
    this.updateCustomPermission(permission, target.checked);
  }
}
