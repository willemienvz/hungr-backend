import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Special } from '../../../types/special';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { SpecialsAnalyticsService, SpecialsMetrics } from '../../../shared/services/specials-analytics.service';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { TableColumn, TableAction } from '../../shared/data-table/data-table.component';
import { ViewSpecialDialogComponent } from '../shared/view-special-dialog/view-special-dialog.component';

@Component({
  selector: 'app-specials-landing',
  templateUrl: './specials-landing.component.html',
  styleUrl: './specials-landing.component.scss'
})
export class SpecialsLandingComponent implements OnInit {
  // Data properties
  activeSpecials: Special[] = [];
  inactiveSpecials: Special[] = [];
  draftSpecials: Special[] = [];
  metrics: SpecialsMetrics | null = null;

  // UI state properties
  isPopupMenuOpen: boolean[] = [];
  isLoading: boolean = false;
  selectedFilter: string = 'all';
  ownerId: string = '';

  // Table configurations
  activeSpecialsColumns: TableColumn[] = [
    {
      key: 'specialTitle',
      label: 'Special Name',
      sortable: true
    },
    {
      key: 'typeSpecial',
      label: 'Type',
      format: (value, row: any) => {
        if (value === null || value === undefined) return 'Unknown';
        return this.getSpecialTypeLabel(value);
      }
    }
  ];

  inactiveSpecialsColumns: TableColumn[] = [
    {
      key: 'specialTitle',
      label: 'Special Name',
      sortable: true
    },
    {
      key: 'typeSpecial',
      label: 'Type',
      format: (value, row: any) => {
        if (value === null || value === undefined) return 'Unknown';
        return this.getSpecialTypeLabel(value);
      }
    }
  ];

  draftSpecialsColumns: TableColumn[] = [
    {
      key: 'specialTitle',
      label: 'Special Name',
      sortable: true
    },
    {
      key: 'typeSpecial',
      label: 'Type',
      format: (value, row: any) => {
        if (value === null || value === undefined) return 'Unknown';
        return this.getSpecialTypeLabel(value);
      }
    }
  ];

  activeSpecialsActions: TableAction[] = [
    {
      key: 'view',
      label: 'View Details',
      icon: 'visibility',
      color: 'secondary'
    },
    {
      key: 'edit',
      label: 'Edit Special',
      icon: 'edit',
      color: 'secondary'
    },
    {
      key: 'toggle',
      label: 'Deactivate',
      icon: 'toggle_off',
      color: 'warning'
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: 'delete',
      color: 'danger'
    }
  ];

  inactiveSpecialsActions: TableAction[] = [
    {
      key: 'view',
      label: 'View Details',
      icon: 'visibility',
      color: 'secondary'
    },
    {
      key: 'edit',
      label: 'Edit Special',
      icon: 'edit',
      color: 'secondary'
    },
    {
      key: 'toggle',
      label: 'Activate',
      icon: 'toggle_on',
      color: 'success'
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: 'delete',
      color: 'danger'
    }
  ];

  draftSpecialsActions: TableAction[] = [
    {
      key: 'view',
      label: 'View Details',
      icon: 'visibility',
      color: 'secondary'
    },
    {
      key: 'edit',
      label: 'Edit Special',
      icon: 'edit',
      color: 'secondary'
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: 'delete',
      color: 'danger'
    }
  ];

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user')!);
    this.ownerId = user.uid;
    this.loadData();
  }

  constructor(
    private firestore: AngularFirestore,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private analyticsService: SpecialsAnalyticsService
  ) { }

  private loadData() {
    this.isLoading = true;

    // Load metrics
    this.analyticsService.getSpecialsMetrics(this.ownerId).subscribe(metrics => {
      this.metrics = metrics;
    });

    // Load categorized specials
    this.analyticsService.getCategorizedSpecials(this.ownerId).subscribe(data => {
      this.activeSpecials = data.activeSpecials;
      this.inactiveSpecials = data.inactiveSpecials;
      this.draftSpecials = data.draftSpecials;
      this.isLoading = false;
    });
  }

  onFilterChange(filterValue: string) {
    this.selectedFilter = filterValue;
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  // Toggle special between active and inactive
  toggleSpecialStatus(special: Special, index: number) {
    this.analyticsService.toggleSpecialStatus(special.specialID, special.active)
      .then(() => {
        this.loadData(); // Refresh data
        this.snackBar.open(
          `Special ${special.active ? 'deactivated' : 'activated'} successfully`,
          'Close',
          { duration: 3000 }
        );
      })
      .catch(error => {
        console.error('Error toggling special status:', error);
        this.snackBar.open('Error updating special status', 'Close', { duration: 3000 });
      });
  }

  viewSpecialDetails(special: Special) {
    const dialogRef = this.dialog.open(ViewSpecialDialogComponent, {
      width: '800px',
      panelClass: 'special-view-dialog-panel',
      data: special
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'edit') {
        // Navigate to edit page
        this.router.navigate(['/specials/edit-special', special.specialID]);
      }
    });
  }

  deleteSpecial(id: string, index: number) {
    const data: DeleteConfirmationData = {
      title: 'Delete Special',
      itemType: 'special',
      message: 'Are you sure you want to delete this special? This action cannot be undone.',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    };

    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent, {
      width: '450px',
      panelClass: 'delete-confirmation-modal-panel',
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.analyticsService.deleteSpecial(id)
          .then(() => {
            this.loadData(); // Refresh data
            this.snackBar.open('Special deleted successfully', 'Close', { duration: 3000 });
          })
          .catch(error => {
            console.error('Error deleting special:', error);
            this.snackBar.open('Error deleting special', 'Close', { duration: 3000 });
          });
      }
    });
  }

  getSpecialTypeLabel(type: number): string {
    switch (type) {
      case 1: return 'Percentage Discount';
      case 2: return 'Price Discount';
      case 3: return 'Combo Deal';
      case 4: return 'Category Special';
      default: return 'Special Type';
    }
  }

  getSpecialStatus(special: Special): string {
    if (special.isDraft) return 'Draft';
    return special.active ? 'Active' : 'Inactive';
  }

  formatCurrency(amount: number): string {
    return `R ${amount.toLocaleString()}`;
  }

  /**
   * Handle special table actions for all table types
   */
  onSpecialAction(event: any, tableType: 'active' | 'inactive' | 'draft') {
    const { action, row, index } = event;

    switch (action.key) {
      case 'view':
        // Open view special dialog
        this.viewSpecialDetails(row);
        break;

      case 'edit':
        // Navigate to edit special page
        this.router.navigate(['/specials/edit-special', row.specialID]);
        break;

      case 'toggle':
        // Toggle active/inactive status
        this.toggleSpecialStatus(row, index);
        break;

      case 'delete':
        // Delete special
        this.deleteSpecial(row.specialID, index);
        break;

      default:
        console.log('Unknown action:', action.key);
    }
  }

  /**
   * Handle row click - trigger first available action
   */
  onRowClick(event: any, tableType: 'active' | 'inactive' | 'draft') {
    const { row, index } = event;

    // Get the appropriate actions array based on table type
    let actions: TableAction[];
    switch (tableType) {
      case 'active':
        actions = this.activeSpecialsActions;
        break;
      case 'inactive':
        actions = this.inactiveSpecialsActions;
        break;
      case 'draft':
        actions = this.draftSpecialsActions;
        break;
      default:
        return;
    }

    // Find the first available action for this row
    const firstAvailableAction = actions.find(action =>
      action.visible ? action.visible(row) : true
    );

    if (firstAvailableAction) {
      this.onSpecialAction({ action: firstAvailableAction, row, index }, tableType);
    }
  }
}
