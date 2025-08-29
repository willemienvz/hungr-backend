import { Component, OnInit, ViewChild } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { User, UserRole, UserPermissions } from '../../shared/services/user';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ViewUsersComponent } from './view-users/view-users.component';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { PermissionService } from '../../shared/services/permission.service';
import { EmailService, InvitationEmailData } from '../../shared/services/email.service';
import { TableColumn, TableAction } from '../shared/data-table/data-table.component';
@Component({
  selector: 'app-manage-users',
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.scss'],
})
export class ManageUsersComponent implements OnInit {
  @ViewChild('editDialog') editDialog: ViewUsersComponent;
  @ViewChild('addUser') addUser: any;
  users: User[] = [];
  isSaving: boolean = false;
  mainUserName: string = '';

  // Permissions management
  selectedUserForPermissions: User | null = null;
  showPermissionsDialog: boolean = false;

  // Table configuration
  userColumns: TableColumn[] = [
    {
      key: 'firstName',
      label: 'User',
      format: (value, row: any) => {
        if (!row || !row.firstName) return 'Unknown User';
        return `${row.firstName} ${row.Surname || ''}`.trim();
      }
    },
    {
      key: 'email',
      label: 'Email Address',
      sortable: true
    },
    {
      key: 'role',
      label: 'Role',
      format: (value, row: any) => {
        if (!row) return 'Unknown';
        return this.getUserRoleDisplayName(row);
      }
    },
    {
      key: 'permissions',
      label: 'Permissions',
      width: '200px',
      format: (value, row: any) => {
        if (!row) return 'Unknown';
        if (!row.permissions) return 'Default permissions';
        const count = this.getPermissionCount(row);
        return `${count}/7 permissions`;
      }
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      format: (value, row: any) => {
        if (!row) return 'Unknown';
        const status = this.getUserStatus(row);
        if (status.isActive) return 'Active';
        if (status.isPending) return 'Pending';
        return status.status || 'Inactive';
      }
    }
  ];

  userActions: TableAction[] = [
    {
      key: 'view',
      label: 'View User',
      icon: 'visibility',
      color: 'secondary'
    },
    {
      key: 'permissions',
      label: 'Manage Permissions',
      icon: 'security',
      color: 'secondary'
    },
    {
      key: 'edit',
      label: 'Edit User',
      icon: 'edit',
      color: 'secondary'
    },
    {
      key: 'resend',
      label: 'Resend Invitation',
      icon: 'email',
      color: 'warning',
      visible: (user: User) => this.getUserStatus(user).isPending
    },
    {
      key: 'delete',
      label: 'Delete User',
      icon: 'delete',
      color: 'danger'
    }
  ];

  pageActions: any[] = [
    {
      label: '+ Add User',
      type: 'secondary' as const,
      onClick: () => this.addUser.openPopup()
    }
  ];

  constructor(
    private readonly firestore: AngularFirestore,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private permissionService: PermissionService,
    private emailService: EmailService
  ) { }

  ngOnInit() {
    this.isSaving = true;
    this.fetchUsers();
  }

  private fetchUsers() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const parentId = user.uid;
    this.mainUserName = user.email;
    this.firestore
      .collection<User>('users', (ref) => ref.where('parentId', '==', parentId))
      .valueChanges()
      .subscribe((users) => {
        this.users = users;
        this.isSaving = false;
      });
  }



  viewUser(user: User) {
    if (this.editDialog) {
      this.editDialog.openPopup(user);
    } else {
      console.error('editDialog not available');
    }
  }

  confirmDeleteUser(uid: string, index: number) {
    const user = this.users.find(u => u.uid === uid);
    const userName = user ? `${user.firstName} ${user.Surname}` : 'this user';

    const data: DeleteConfirmationData = {
      title: 'Delete User',
      itemName: userName,
      itemType: 'user',
      message: `Are you sure you want to delete ${userName}? This will remove their access to the system and cannot be undone.`,
      confirmButtonText: 'Yes, Delete User',
      cancelButtonText: 'Cancel'
    };

    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent, {
      width: '450px',
      panelClass: 'delete-confirmation-modal-panel',
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteUser(uid, index);
      }
    });
  }

  private deleteUser(uid: string, index: number) {
    const userRef: AngularFirestoreDocument<any> = this.firestore.doc(
      `users/${uid}`
    );
    userRef.delete().then(() => {
      this.toastr.success('User deleted successfully!');
    }).catch(error => {
      console.error('Error deleting user:', error);
      this.toastr.error('Error deleting user');
    });
  }

  editUser(user: User, index: number) {
    if (this.editDialog) {
      this.editDialog.openPopup(user);
    } else {
      console.error('editDialog not available');
    }
  }

  /**
   * Get role display name for a user
   */
  getUserRoleDisplayName(user: User): string {
    if (!user.role) {
      return 'Editor'; // Default role for existing users
    }
    return this.permissionService.getRoleDisplayName(user.role);
  }

  /**
   * Get user status including invitation status
   */
  getUserStatus(user: User): { status: string; isActive: boolean; isPending: boolean } {
    if (user.invitationAccepted === false && user.invitedAt) {
      // Check if invitation has expired (7 days)
      const invitedDate = user.invitedAt instanceof Date ? user.invitedAt : new Date(user.invitedAt);
      const expiryDate = new Date(invitedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();

      if (now > expiryDate) {
        return { status: 'Expired', isActive: false, isPending: false };
      }
      return { status: 'Pending', isActive: false, isPending: true };
    }

    return { status: 'Active', isActive: true, isPending: false };
  }

  /**
   * Resend invitation to a user
   */
  resendInvitation(user: User) {
    if (!user.invitationToken || !user.invitedAt) {
      this.toastr.error('No invitation data found for this user');
      return;
    }

    const invitationData: InvitationEmailData = {
      email: user.email,
      firstName: user.firstName,
      lastName: user.Surname,
      role: user.role || 'editor',
      invitationToken: user.invitationToken,
      invitedBy: user.invitedBy || 'Admin',
      restaurantName: this.getRestaurantName()
    };

    this.emailService.sendInvitationReminderEmail(invitationData).subscribe({
      next: (response) => {
        console.log('Invitation reminder sent successfully:', response);
        this.toastr.success('Invitation reminder sent successfully!');
      },
      error: (error) => {
        console.error('Failed to send invitation reminder:', error);
        this.toastr.error('Failed to send invitation reminder. Please try again.');
      }
    });
  }

  private getRestaurantName(): string {
    // Get restaurant name from localStorage or settings
    // For now, return a default name
    return 'Hungr Restaurant';
  }

  /**
   * Get role badge CSS class
   */
  getRoleBadgeClass(user: User): string {
    const role = user.role || 'editor';
    return `role-badge role-${role}`;
  }

  /**
   * Check if current user can manage users
   */
  canManageUsers(): boolean {
    // TODO: Implement based on current user's permissions
    // For now, assume main user can manage users
    return true;
  }

  /**
   * Open permissions management dialog
   */
  managePermissions(user: User) {
    this.selectedUserForPermissions = user;
    this.showPermissionsDialog = true;
  }

  /**
   * Close permissions management dialog
   */
  closePermissionsDialog() {
    this.showPermissionsDialog = false;
    this.selectedUserForPermissions = null;
    // Refresh users list to show updated permissions
    this.fetchUsers();
  }

  /**
   * Check if a user has a specific permission
   */
  hasUserPermission(user: User, permission: keyof UserPermissions): boolean {
    if (user.role === 'admin') {
      return true;
    }

    if (user.role === 'custom' && user.permissions) {
      return user.permissions[permission];
    }

    const rolePermissions = this.permissionService.getPermissionsForRole(user.role || 'editor');
    return rolePermissions[permission];
  }

  /**
   * Get the count of active permissions for a user
   */
  getPermissionCount(user: User): number {
    if (user.role === 'admin') {
      return 7; // All permissions
    }

    if (user.role === 'custom' && user.permissions) {
      return Object.values(user.permissions).filter(Boolean).length;
    }

    const rolePermissions = this.permissionService.getPermissionsForRole(user.role || 'editor');
    return Object.values(rolePermissions).filter(Boolean).length;
  }

  /**
   * Get count of active users
   */
  getActiveUsersCount(): number {
    return this.users.filter(u => this.getUserStatus(u).isActive).length;
  }

  /**
   * Get count of pending users
   */
  getPendingUsersCount(): number {
    return this.users.filter(u => this.getUserStatus(u).isPending).length;
  }

  /**
   * Handle user table actions
   */
  onUserAction(event: any) {
    const { action, row, index } = event;

    switch (action.key) {
      case 'view':
        this.viewUser(row);
        break;
      case 'permissions':
        this.managePermissions(row);
        break;
      case 'edit':
        this.editUser(row, index);
        break;
      case 'resend':
        this.resendInvitation(row);
        break;
      case 'delete':
        this.confirmDeleteUser(row.uid, index);
        break;
    }
  }
}
