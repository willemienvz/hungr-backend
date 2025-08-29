import { Injectable } from '@angular/core';
import { UserRole, UserPermissions } from './user';

@Injectable({
    providedIn: 'root'
})
export class PermissionService {

    // Permission presets for each role
    private readonly ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
        admin: {
            viewAnalytics: true,
            createMenus: true,
            editMenus: true,
            editRestaurants: true,
            addSpecials: true,
            editBranding: true,
            manageUsers: true
        },
        editor: {
            viewAnalytics: true,
            createMenus: true,
            editMenus: true,
            editRestaurants: false,
            addSpecials: true,
            editBranding: false,
            manageUsers: false
        },
        viewer: {
            viewAnalytics: true,
            createMenus: false,
            editMenus: false,
            editRestaurants: false,
            addSpecials: false,
            editBranding: false,
            manageUsers: false
        },
        custom: {
            viewAnalytics: false,
            createMenus: false,
            editMenus: false,
            editRestaurants: false,
            addSpecials: false,
            editBranding: false,
            manageUsers: false
        }
    };

    constructor() { }

    /**
     * Get default permissions for a role
     */
    getPermissionsForRole(role: UserRole): UserPermissions {
        return { ...this.ROLE_PERMISSIONS[role] };
    }

    /**
     * Check if a user has a specific permission
     */
    hasPermission(userRole: UserRole, userPermissions: UserPermissions | undefined, permission: keyof UserPermissions): boolean {
        if (userRole === 'admin') {
            return true;
        }

        if (userRole === 'custom' && userPermissions) {
            return userPermissions[permission];
        }

        const rolePermissions = this.getPermissionsForRole(userRole);
        return rolePermissions[permission];
    }

    /**
     * Get all available permissions
     */
    getAllPermissions(): (keyof UserPermissions)[] {
        return [
            'viewAnalytics',
            'createMenus',
            'editMenus',
            'editRestaurants',
            'addSpecials',
            'editBranding',
            'manageUsers'
        ];
    }

    /**
     * Get user-friendly permission labels
     */
    getPermissionLabels(): Record<keyof UserPermissions, string> {
        return {
            viewAnalytics: 'View Analytics',
            createMenus: 'Create Menus',
            editMenus: 'Edit Menus',
            editRestaurants: 'Edit Restaurant Settings',
            addSpecials: 'Add Specials',
            editBranding: 'Edit Branding',
            manageUsers: 'Manage Users'
        };
    }

    /**
     * Get role display name
     */
    getRoleDisplayName(role: UserRole): string {
        const roleNames: Record<UserRole, string> = {
            admin: 'Admin',
            editor: 'Editor',
            viewer: 'Viewer',
            custom: 'Custom'
        };
        return roleNames[role];
    }

    /**
     * Get role description
     */
    getRoleDescription(role: UserRole): string {
        const descriptions: Record<UserRole, string> = {
            admin: 'Full access to all features and settings',
            editor: 'Can create and edit menus, view analytics, and add specials',
            viewer: 'Can only view analytics and reports',
            custom: 'Custom permissions set by admin'
        };
        return descriptions[role];
    }

    /**
     * Validate permission object
     */
    validatePermissions(permissions: UserPermissions): boolean {
        const allPermissions = this.getAllPermissions();
        return allPermissions.every(permission =>
            typeof permissions[permission] === 'boolean'
        );
    }
}

