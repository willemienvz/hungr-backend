import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Special } from '../../../shared/services/special';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { SpecialsAnalyticsService, SpecialsMetrics } from '../../../shared/services/specials-analytics.service';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
  selector: 'app-specials-landing',
  templateUrl: './specials-landing.component.html',
  styleUrl: './specials-landing.component.scss'
})
export class SpecialsLandingComponent implements OnInit{
  // Data properties
  activeSpecials: Special[] = [];
  inactiveSpecials: Special[] = [];
  draftSpecials: Special[] = [];
  metrics: SpecialsMetrics | null = null;
  
  // UI state properties
  isPopupMenuOpen: boolean[] = [];
  selectedFilter: string = 'all';
  ownerId: string = '';
  
  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user')!);
    this.ownerId = user.uid;
    this.loadData();
  }
  
  constructor(
    private firestore: AngularFirestore,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private analyticsService: SpecialsAnalyticsService
  ){}
  
  private loadData() {
    // Load metrics
    this.analyticsService.getSpecialsMetrics(this.ownerId).subscribe(metrics => {
      this.metrics = metrics;
    });

    // Load categorized specials
    this.analyticsService.getCategorizedSpecials(this.ownerId).subscribe(data => {
      this.activeSpecials = data.activeSpecials;
      this.inactiveSpecials = data.inactiveSpecials;
      this.draftSpecials = data.draftSpecials;
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
      case 1: return 'Weekly Special';
      case 2: return 'Category Special';
      case 3: return 'Combo Special';
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
}
