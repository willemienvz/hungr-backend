import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgForm } from '@angular/forms';
import { User, UserRole, UserPermissions } from '../../../shared/services/user';
import { PermissionService } from '../../../shared/services/permission.service';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent {
  @Input() mode: 'add' | 'edit' = 'add';
  @Input() user: Partial<User> = {};
  @Input() isSaving: boolean = false;
  @Output() cancel = new EventEmitter<void>();
  @Output() submit = new EventEmitter<any>();

  availableRoles: UserRole[] = ['admin', 'editor', 'viewer', 'custom'];
  role: UserRole = 'editor';
  permissions: UserPermissions = {
    viewAnalytics: false,
    createMenus: false,
    editMenus: false,
    editRestaurants: false,
    addSpecials: false,
    editBranding: false,
    manageUsers: false
  };
  showCustomPermissions: boolean = false;

  constructor(private permissionService: PermissionService) {}

  ngOnInit() {
    if (this.mode === 'edit' && this.user) {
      this.role = (this.user.role as UserRole) || 'editor';
      this.permissions = this.user.permissions || this.permissionService.getPermissionsForRole(this.role);
      this.showCustomPermissions = this.role === 'custom';
    } else {
      this.role = 'editor';
      this.permissions = this.permissionService.getPermissionsForRole(this.role);
      this.showCustomPermissions = false;
    }
  }

  onRoleChange(role: UserRole) {
    this.role = role;
    this.showCustomPermissions = role === 'custom';
    if (role !== 'custom') {
      this.permissions = { ...this.permissionService.getPermissionsForRole(role) };
    }
  }

  onPermissionChange(value: boolean, permission: keyof UserPermissions) {
    this.permissions[permission] = value;
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

  onCancel() {
    this.cancel.emit();
  }

  onSubmit(form: NgForm) {
    if (form.invalid || this.isSaving) return;
    const payload = {
      ...this.user,
      role: this.role,
      permissions: this.role === 'custom' ? this.permissions : this.permissionService.getPermissionsForRole(this.role)
    };
    this.submit.emit(payload);
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
      'firstName': 'First Name',
      'Surname': 'Last Name',
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


