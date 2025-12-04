import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Subject } from 'rxjs';
import { takeUntil, first } from 'rxjs/operators';

import { Special } from '../../../types/special';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { TableColumn, TableAction } from '../../shared/data-table/data-table.component';
import { ViewSpecialDialogComponent } from '../shared/view-special-dialog/view-special-dialog.component';

// Simple interface for metrics since we removed the analytics service
interface SpecialsMetrics {
  totalSpecialSales: { amount: number; percentage: string };
  specialViews: { count: number; percentage: string };
  topPerformingSpecial: { name: string; performance: string };
  specialsOrdered: { count: number; percentage: string };
}

@Component({
  selector: 'app-specials-landing',
  templateUrl: './specials-landing.component.html',
  styleUrl: './specials-landing.component.scss'
})
export class SpecialsLandingComponent implements OnInit, OnDestroy {
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

  // Subscription management
  private destroy$ = new Subject<void>();

  // Day name mapping from abbreviated to full names
  private readonly dayNameMap: { [key: string]: string } = {
    'Mon': 'Monday',
    'Tue': 'Tuesday',
    'Wed': 'Wednesday',
    'Thu': 'Thursday',
    'Fri': 'Friday',
    'Sat': 'Saturday',
    'Sun': 'Sunday'
  };

  // All weekdays in order
  private readonly allWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Table configurations - SIMPLIFIED to prevent hanging
  activeSpecialsColumns: TableColumn[] = [
    {
      key: 'specialTitle',
      label: 'Special Name',
      sortable: true
    },
    {
      key: 'timeDate',
      label: 'Time/Date',
      format: (value: any, row?: any) => this.formatTimeDate(value, row)
    },
    {
      key: 'typeSpecial',
      label: 'Type',
      format: (value: any) => {
        // Simplified format function - no method calls
        if (value === null || value === undefined) return 'Unknown';
        const typeMap: { [key: number]: string } = {
          1: 'Percentage Discount',
          2: 'Price Discount',
          3: 'Combo Deal',
          4: 'Category Special'
        };
        return typeMap[value] || 'Special Type';
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
      key: 'timeDate',
      label: 'Time/Date',
      format: (value: any, row?: any) => this.formatTimeDate(value, row)
    },
    {
      key: 'typeSpecial',
      label: 'Type',
      format: (value: any) => {
        // Simplified format function - no method calls
        if (value === null || value === undefined) return 'Unknown';
        const typeMap: { [key: number]: string } = {
          1: 'Percentage Discount',
          2: 'Price Discount',
          3: 'Combo Deal',
          4: 'Category Special'
        };
        return typeMap[value] || 'Special Type';
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
      key: 'timeDate',
      label: 'Time/Date',
      format: (value: any, row?: any) => this.formatTimeDate(value, row)
    },
    {
      key: 'typeSpecial',
      label: 'Type',
      format: (value: any) => {
        // Simplified format function - no method calls
        if (value === null || value === undefined) return 'Unknown';
        const typeMap: { [key: number]: string } = {
          1: 'Percentage Discount',
          2: 'Price Discount',
          3: 'Combo Deal',
          4: 'Category Special'
        };
        return typeMap[value] || 'Special Type';
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

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private firestore: AngularFirestore
  ) { }

  ngOnInit() {
    this.isLoading = true;
    // Use setTimeout to ensure component is fully initialized
    setTimeout(() => {
      this.fetchSpecials();
    }, 100);
  }

  private fetchSpecials() {
    console.log('🟢 fetchSpecials() called');
    try {
      console.log('🟢 Getting user from localStorage...');
      const user = JSON.parse(localStorage.getItem('user')!);
      console.log('🟢 User parsed:', user ? 'exists' : 'null');
      if (!user || !user.uid) {
        console.error('Invalid user data');
        this.isLoading = false;
        return;
      }

      const OwnerID = user.uid;
      this.ownerId = OwnerID;

      console.log('🟢 Fetching specials for OwnerID:', OwnerID);
      
      // CRITICAL FIX: Check if component is still alive before proceeding
      if (this.destroy$.closed) {
        console.warn('Component already destroyed, aborting fetch');
        return;
      }
      
      // Try a completely different approach - use snapshotChanges with first() operator
      // This will get one snapshot and complete immediately
      console.log('Trying snapshotChanges().pipe(first())...');
      
      this.firestore
        .collection<Special>('specials', ref => ref.where('OwnerID', '==', OwnerID))
        .snapshotChanges()
        .pipe(
          first(), // Get first emission and complete
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (snapshots: any) => {
            console.log('✅ snapshotChanges SUCCESS - Snapshots:', snapshots?.length || 0);
            const specials = (snapshots || []).map((snapshot: any) => {
              const data = snapshot.payload.doc.data();
              const id = snapshot.payload.doc.id;
              return {
                ...data,
                firestoreId: id,
                specialID: id
              };
            });
            this.processSpecials(specials);
            
            // Set up valueChanges for real-time updates after initial load
            this.setupRealtimeListener(
              this.firestore.collection<Special>('specials', ref => ref.where('OwnerID', '==', OwnerID))
            );
          },
          error: (error) => {
            console.error('❌ snapshotChanges FAILED - Error:', error);
            console.error('Error code:', error?.code);
            console.error('Error message:', error?.message);
            
            // Final fallback: show empty state
            this.isLoading = false;
            this.activeSpecials = [];
            this.inactiveSpecials = [];
            this.draftSpecials = [];
            this.metrics = {
              totalSpecialSales: { amount: 0, percentage: '0%' },
              specialViews: { count: 0, percentage: '0%' },
              topPerformingSpecial: { name: 'N/A', performance: 'N/A' },
              specialsOrdered: { count: 0, percentage: '0%' }
            };
            
            this.snackBar.open('Unable to load specials. Please refresh the page or contact support.', 'Close', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
              panelClass: ['hungr-snackbar']
            });
          }
        });
    } catch (error) {
      console.error('Error in fetchSpecials:', error);
      this.isLoading = false;
    }
  }

  private setupRealtimeListener(queryRef: any) {
    // Set up real-time listener for updates after initial load
    queryRef
      .valueChanges({ idField: 'firestoreId' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (specials: any[]) => {
          console.log('Real-time update received:', specials?.length || 0);
          const specialsWithId = (specials || []).map(special => ({
            ...special,
            specialID: special.firestoreId || special.specialID
          }));
          this.processSpecials(specialsWithId);
        },
        error: (error) => {
          console.error('Real-time listener error:', error);
          // Don't show error to user, initial load already worked
        }
      });
  }

  onFilterChange(filterValue: string) {
    this.selectedFilter = filterValue;
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  toggleSpecialStatus(special: Special, index: number) {
    const newStatus = !special.active;
    const updateData = { active: newStatus };
    
    this.firestore
      .doc(`specials/${special.specialID}`)
      .update(updateData)
      .then(() => {
        this.snackBar.open(
          `Special ${newStatus ? 'activated' : 'deactivated'} successfully`,
          'Close',
          { 
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['hungr-snackbar']
          }
        );
      })
      .catch((error) => {
        console.error('Error toggling special status:', error);
        this.snackBar.open('Error updating special status', 'Close', { 
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['hungr-snackbar']
        });
      });
  }

  viewSpecialDetails(special: Special) {
    const dialogRef = this.dialog.open(ViewSpecialDialogComponent, {
      width: '800px',
      panelClass: 'special-view-dialog-panel',
      data: special
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result === 'edit') {
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

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.firestore
            .doc(`specials/${id}`)
            .delete()
            .then(() => {
              this.snackBar.open('Special deleted successfully', 'Close', { 
                duration: 3000,
                horizontalPosition: 'center',
                verticalPosition: 'bottom',
                panelClass: ['hungr-snackbar']
              });
            })
            .catch((error) => {
              console.error('Error deleting special:', error);
              this.snackBar.open('Error deleting special', 'Close', { 
                duration: 3000,
                horizontalPosition: 'center',
                verticalPosition: 'bottom',
                panelClass: ['hungr-snackbar']
              });
            });
        }
      });
  }

  private processSpecials(specials: any[]) {
    try {
      console.log('Processing specials:', specials?.length || 0);
      const specialsWithId = (specials || []).map(special => ({
        ...special,
        specialID: special.firestoreId || special.specialID
      }));
      
      this.activeSpecials = specialsWithId.filter(s => s.active && !s.isDraft) || [];
      this.inactiveSpecials = specialsWithId.filter(s => !s.active && !s.isDraft) || [];
      this.draftSpecials = specialsWithId.filter(s => s.isDraft) || [];
      
      console.log('Active:', this.activeSpecials.length, 'Inactive:', this.inactiveSpecials.length, 'Drafts:', this.draftSpecials.length);
      
      this.isLoading = false;

      this.metrics = {
        totalSpecialSales: { amount: 0, percentage: '0%' },
        specialViews: { count: 0, percentage: '0%' },
        topPerformingSpecial: { name: 'N/A', performance: 'N/A' },
        specialsOrdered: { count: 0, percentage: '0%' }
      };
    } catch (error) {
      console.error('Error processing specials:', error);
      this.isLoading = false;
    }
  }


  ngOnDestroy() {
    // Clean up all subscriptions using takeUntil pattern
    this.destroy$.next();
    this.destroy$.complete();
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
   * Formats the time/date information for a special
   * @param value - Not used, but required by TableColumn format signature
   * @param row - The Special object containing selectedDays, timeFrom, timeTo
   * @returns Formatted string displaying days and times
   */
  formatTimeDate(value: any, row?: any): string {
    if (!row) return '';

    const special = row as Special;
    const selectedDays = special.selectedDays || [];
    const timeFrom = (special.timeFrom || '').trim();
    const timeTo = (special.timeTo || '').trim();

    // Infer isAllDay from times - check multiple patterns
    // All day can be: "00:00" to "23:59" (standard) or "00:00" to "00:00" (midnight to midnight)
    const isAllDay = (timeFrom === '00:00' && timeTo === '23:59') || 
                     (timeFrom === '00:00' && timeTo === '00:00');

    // Format time portion
    let timeStr = '';
    if (isAllDay) {
      timeStr = 'All Day';
    } else if (timeFrom && timeTo) {
      timeStr = `${timeFrom} - ${timeTo}`;
    } else if (timeFrom || timeTo) {
      timeStr = timeFrom || timeTo;
    }

    // Handle empty selectedDays
    if (selectedDays.length === 0) {
      return timeStr || 'Not set';
    }

    // Check if all 7 days are selected
    const allDaysSelected = selectedDays.length === 7 && 
      this.allWeekdays.every(day => selectedDays.includes(day));

    // Check if only weekend (Sat and Sun) is selected
    const onlyWeekend = selectedDays.length === 2 && 
      selectedDays.includes('Sat') && selectedDays.includes('Sun');

    // Format day portion
    let dayStr = '';
    if (allDaysSelected) {
      dayStr = 'All week';
    } else if (onlyWeekend) {
      dayStr = 'All Weekend';
    } else {
      // Map abbreviated days to full names and join
      const fullDayNames = selectedDays
        .map(day => this.dayNameMap[day] || day)
        .join(', ');
      dayStr = fullDayNames;
    }

    // Combine day and time info
    if (dayStr && timeStr) {
      return `${dayStr}, ${timeStr}`;
    } else if (dayStr) {
      return dayStr;
    } else if (timeStr) {
      return timeStr;
    }

    return 'Not set';
  }

  // Separate handlers for each table type (matching menus component pattern)
  onActiveSpecialAction(event: any) {
    const { action, row, index } = event;
    this.handleSpecialAction(action, row, index);
  }

  onInactiveSpecialAction(event: any) {
    const { action, row, index } = event;
    this.handleSpecialAction(action, row, index);
  }

  onDraftSpecialAction(event: any) {
    const { action, row, index } = event;
    this.handleSpecialAction(action, row, index);
  }

  onActiveRowClick(event: any) {
    const { row, index } = event;
    const firstAction = this.activeSpecialsActions.find(action =>
      action.visible ? action.visible(row) : true
    );
    if (firstAction) {
      this.handleSpecialAction(firstAction, row, index);
    }
  }

  onInactiveRowClick(event: any) {
    const { row, index } = event;
    const firstAction = this.inactiveSpecialsActions.find(action =>
      action.visible ? action.visible(row) : true
    );
    if (firstAction) {
      this.handleSpecialAction(firstAction, row, index);
    }
  }

  onDraftRowClick(event: any) {
    const { row, index } = event;
    const firstAction = this.draftSpecialsActions.find(action =>
      action.visible ? action.visible(row) : true
    );
    if (firstAction) {
      this.handleSpecialAction(firstAction, row, index);
    }
  }

  private handleSpecialAction(action: TableAction, row: Special, index: number) {
    switch (action.key) {
      case 'view':
        this.viewSpecialDetails(row);
        break;
      case 'edit':
        this.router.navigate(['/specials/edit-special', row.specialID]);
        break;
      case 'toggle':
        this.toggleSpecialStatus(row, index);
        break;
      case 'delete':
        this.deleteSpecial(row.specialID, index);
        break;
      default:
        console.log('Unknown action:', action.key);
    }
  }
}
