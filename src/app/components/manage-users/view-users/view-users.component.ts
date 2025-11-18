import { Component, Input } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { User, UserRole, UserPermissions } from '../../../shared/services/user';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { PermissionService } from '../../../shared/services/permission.service';
@Component({
  selector: 'app-view-users',
  templateUrl: './view-users.component.html',
  styleUrl: './view-users.component.scss',
})
export class ViewUsersComponent {
  @Input() user: User;

  showPopup: boolean = false;
  isSaving: boolean = false;
  isEditMode: boolean = false;

  // Role and permission properties
  availableRoles: UserRole[] = ['admin', 'editor', 'viewer', 'custom'];
  editRole: UserRole = 'editor';
  editPermissions: UserPermissions = {
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
    private readonly toastr: ToastrService,
    private readonly firestore: AngularFirestore,
    private permissionService: PermissionService
  ) { }

  openPopup(user: any) {
    this.user = { ...user };
    this.initializeRoleAndPermissions();
    this.showPopup = true;
    this.isEditMode = false; // Start in view mode
  }

  openEdit(user: any) {
    this.user = { ...user };
    this.initializeRoleAndPermissions();
    this.showPopup = true;
    this.isEditMode = true; // Open directly in edit mode
  }

  closePopup() {
    this.showPopup = false;
    this.isEditMode = false;
  }

  private initializeRoleAndPermissions() {
    // Set default values for role and permissions if not present
    this.editRole = this.user.role || 'editor';
    this.editPermissions = this.user.permissions || this.permissionService.getPermissionsForRole(this.editRole);
    this.showCustomPermissions = this.editRole === 'custom';
  }

  switchToEditMode() {
    this.isEditMode = true;
  }

  switchToViewMode() {
    this.isEditMode = false;
  }

  updateUser(updatedUser: Partial<User>) {
    this.isSaving = true;
    const userRef: AngularFirestoreDocument<User> = this.firestore.doc(
      `users/${updatedUser.uid}`
    );

    const updatedData = {
      firstName: updatedUser.firstName,
      Surname: updatedUser.Surname,
      cellphoneNumber: updatedUser.cellphoneNumber,
      role: this.editRole,
      permissions: this.editRole === 'custom' ? this.editPermissions : this.permissionService.getPermissionsForRole(this.editRole)
    };

    userRef
      .update(updatedData)
      .then(() => {
        this.toastr.success('User updated successfully!');
        this.isSaving = false;
        this.switchToViewMode(); // Switch back to view mode after successful update
      })
      .catch((error) => {
        this.toastr.error('Error updating user');
        this.isSaving = false;
      });
  }

  // Role and permission management methods
  onRoleChange(role: UserRole) {
    this.editRole = role;
    this.showCustomPermissions = role === 'custom';

    if (role !== 'custom') {
      // Update permissions to match the selected role
      this.editPermissions = { ...this.permissionService.getPermissionsForRole(role) };
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
    this.editPermissions[permission] = value;
  }

  hasPermission(permission: keyof UserPermissions): boolean {
    return this.editPermissions[permission];
  }

  /**
   * Get user status display information
   */
  getUserStatusInfo() {
    if (this.user.invitationAccepted === false && this.user.invitedAt) {
      // Check if invitation has expired (7 days)
      const invitedDate = this.user.invitedAt instanceof Date ? this.user.invitedAt : new Date(this.user.invitedAt);
      const expiryDate = new Date(invitedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();

      if (now > expiryDate) {
        return { status: 'Expired', class: 'expired', icon: 'error' };
      }
      return { status: 'Pending', class: 'pending', icon: 'schedule' };
    }

    return { status: 'Active', class: 'active', icon: 'check_circle' };
  }

  /**
   * Reset permissions to role defaults
   */
  resetToRoleDefaults() {
    if (this.editRole !== 'custom') {
      this.editPermissions = { ...this.permissionService.getPermissionsForRole(this.editRole) };
    }
  }

  /**
   * Handle checkbox change event for custom permissions
   */
  onPermissionChange(event: Event, permission: keyof UserPermissions) {
    const target = event.target as HTMLInputElement;
    this.updateCustomPermission(permission, target.checked);
  }

  getFieldError(fieldName: string): string {
    const field = this.user[fieldName as keyof User];
    if (!field) {
      return `${this.getFieldLabel(fieldName)} is required.`;
    }
    
    if (fieldName === 'email' && field && !this.isValidEmail(field as string)) {
      return 'Enter a valid email address.';
    }
    
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'firstName': 'Name',
      'Surname': 'Surname',
      'email': 'Email address',
      'cellphoneNumber': 'Phone number'
    };
    return labels[fieldName] || fieldName;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
