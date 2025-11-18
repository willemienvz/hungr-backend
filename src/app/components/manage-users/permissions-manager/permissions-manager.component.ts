import { Component, Input, Output, EventEmitter } from '@angular/core';
import { User, UserRole, UserPermissions } from '../../../shared/services/user';
import { PermissionService } from '../../../shared/services/permission.service';
import { ToastrService } from 'ngx-toastr';
import {
    AngularFirestore,
    AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';

@Component({
    selector: 'app-permissions-manager',
    templateUrl: './permissions-manager.component.html',
    styleUrls: ['./permissions-manager.component.scss']
})
export class PermissionsManagerComponent {
    @Input() user: User;
    @Input() showPopup: boolean = false;
    @Output() closePopup = new EventEmitter<void>();

    availableRoles: UserRole[] = ['admin', 'editor', 'viewer', 'custom'];
    selectedRole: UserRole = 'editor';
    permissions: UserPermissions = {
        viewAnalytics: false,
        createMenus: false,
        editMenus: false,
        editRestaurants: false,
        addSpecials: false,
        editBranding: false,
        manageUsers: false
    };

    isSaving: boolean = false;

    constructor(
        public permissionService: PermissionService,
        private toastr: ToastrService,
        private firestore: AngularFirestore
    ) { }

    ngOnChanges() {
        if (this.user) {
            this.initializePermissions();
        }
    }

    private initializePermissions() {
        this.selectedRole = this.user.role || 'editor';
        this.permissions = this.user.permissions || this.permissionService.getPermissionsForRole(this.selectedRole);
    }

    onRoleChange(role: UserRole) {
        this.selectedRole = role;

        if (role !== 'custom') {
            // Update permissions to match the selected role
            this.permissions = { ...this.permissionService.getPermissionsForRole(role) };
        }
    }

    updatePermission(permission: keyof UserPermissions, value: boolean) {
        this.permissions[permission] = value;

        // If we're not in custom mode but user manually changed a permission,
        // switch to custom mode
        if (this.selectedRole !== 'custom') {
            const defaultPermissions = this.permissionService.getPermissionsForRole(this.selectedRole);
            const hasCustomPermissions = Object.keys(this.permissions).some(
                key => this.permissions[key as keyof UserPermissions] !== defaultPermissions[key as keyof UserPermissions]
            );

            if (hasCustomPermissions) {
                this.selectedRole = 'custom';
            }
        }
    }

    onPermissionChange(permission: string, value: boolean) {
        this.updatePermission(permission as keyof UserPermissions, value);
    }

    savePermissions() {
        this.isSaving = true;

        const userRef: AngularFirestoreDocument<User> = this.firestore.doc(`users/${this.user.uid}`);

        const updatedData = {
            role: this.selectedRole,
            permissions: this.selectedRole === 'custom' ? this.permissions : this.permissionService.getPermissionsForRole(this.selectedRole)
        };

        userRef.update(updatedData).then(() => {
            this.toastr.success('Permissions updated successfully!');
            this.isSaving = false;
            this.closePopup.emit();
        }).catch(error => {
            this.toastr.error('Error updating permissions');
            this.isSaving = false;
        });
    }

    cancel() {
        this.closePopup.emit();
    }

    // Helper methods
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

    hasPermission(permission: keyof UserPermissions | string): boolean {
        return this.permissions[permission as keyof UserPermissions];
    }

    resetToRoleDefaults() {
        if (this.selectedRole !== 'custom') {
            this.permissions = { ...this.permissionService.getPermissionsForRole(this.selectedRole) };
        }
    }

    /**
     * Handle checkbox change event for permissions
     */

    /**
     * Get permission value for role preview (for template use)
     */
    getRolePermission(role: UserRole, permission: string): boolean {
        return this.permissionService.getPermissionsForRole(role)[permission as keyof UserPermissions];
    }

    /**
     * Get permission label for template use
     */
    getPermissionLabel(permission: string): string {
        return this.getPermissionLabels()[permission as keyof UserPermissions];
    }
}
