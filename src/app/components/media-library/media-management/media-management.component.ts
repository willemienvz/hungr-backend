import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { MediaManagementService, MediaAnalytics, BulkOperationResult } from '../../../shared/services/media-management.service';
import { MediaLibraryService } from '../../../shared/services/media-library.service';
import { MediaItem } from '../../../shared/types/media';

@Component({
  selector: 'app-media-management',
  templateUrl: './media-management.component.html',
  styleUrls: ['./media-management.component.scss']
})
export class MediaManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Properties
  analytics: MediaAnalytics | null = null;
  selectedMedia: MediaItem[] = [];
  loading = false;
  error: string | null = null;

  // Tab management
  activeTab = 'analytics';

  // Bulk operation properties
  bulkOperationInProgress = false;
  bulkOperationProgress = 0;

  constructor(
    private mediaManagementService: MediaManagementService,
    private mediaLibraryService: MediaLibraryService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadAnalytics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Analytics loading
  async loadAnalytics(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      this.analytics = await this.mediaManagementService.getMediaAnalytics();
    } catch (error) {
      console.error('Error loading analytics:', error);
      this.error = 'Failed to load analytics';
      this.snackBar.open('Error loading analytics', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  // Media selection
  onMediaSelect(media: MediaItem): void {
    const index = this.selectedMedia.findIndex(m => m.id === media.id);
    if (index >= 0) {
      this.selectedMedia.splice(index, 1);
    } else {
      this.selectedMedia.push(media);
    }
  }

  onSelectAll(): void {
    if (this.analytics) {
      this.selectedMedia = [...this.analytics.usageStatistics.mostUsed];
    }
  }

  onClearSelection(): void {
    this.selectedMedia = [];
  }

  // Bulk operations
  async onBulkDelete(): Promise<void> {
    if (this.selectedMedia.length === 0) {
      this.snackBar.open('Please select media items to delete', 'Close', { duration: 3000 });
      return;
    }

    const confirmDialog = this.dialog.open(ConfirmBulkDeleteDialogComponent, {
      width: '400px',
      data: {
        count: this.selectedMedia.length,
        mediaItems: this.selectedMedia
      }
    });

    confirmDialog.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.performBulkDelete();
      }
    });
  }

  async onBulkCategorize(): Promise<void> {
    if (this.selectedMedia.length === 0) {
      this.snackBar.open('Please select media items to categorize', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(BulkCategorizeDialogComponent, {
      width: '400px',
      data: {
        count: this.selectedMedia.length
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.category) {
        await this.performBulkCategorize(result.category);
      }
    });
  }



  // Cleanup operations
  async onCleanupOrphanedFiles(): Promise<void> {
    const confirmDialog = this.dialog.open(ConfirmCleanupDialogComponent, {
      width: '400px',
      data: {
        operation: 'orphaned files cleanup'
      }
    });

    confirmDialog.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.performCleanup();
      }
    });
  }

  async onOptimizeStorage(): Promise<void> {
    const confirmDialog = this.dialog.open(ConfirmCleanupDialogComponent, {
      width: '400px',
      data: {
        operation: 'storage optimization'
      }
    });

    confirmDialog.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.performOptimization();
      }
    });
  }

  // Private methods for bulk operations
  private async performBulkDelete(): Promise<void> {
    try {
      this.bulkOperationInProgress = true;
      this.bulkOperationProgress = 0;

      const mediaIds = this.selectedMedia.map(m => m.id);
      const result = await this.mediaManagementService.bulkDelete(mediaIds);

      this.bulkOperationProgress = 100;

      if (result.successful > 0) {
        this.snackBar.open(`Successfully deleted ${result.successful} media items`, 'Close', { duration: 3000 });
        this.selectedMedia = [];
        await this.loadAnalytics(); // Refresh analytics
      }

      if (result.failed > 0) {
        this.snackBar.open(`Failed to delete ${result.failed} media items`, 'Close', { duration: 5000 });
      }
    } catch (error) {
      console.error('Error performing bulk delete:', error);
      this.snackBar.open('Error performing bulk delete', 'Close', { duration: 3000 });
    } finally {
      this.bulkOperationInProgress = false;
      this.bulkOperationProgress = 0;
    }
  }

  private async performBulkCategorize(category: string): Promise<void> {
    try {
      this.bulkOperationInProgress = true;
      this.bulkOperationProgress = 0;

      const mediaIds = this.selectedMedia.map(m => m.id);
      const result = await this.mediaManagementService.bulkCategorize(mediaIds, category);

      this.bulkOperationProgress = 100;

      if (result.successful > 0) {
        this.snackBar.open(`Successfully categorized ${result.successful} media items`, 'Close', { duration: 3000 });
        this.selectedMedia = [];
        await this.loadAnalytics(); // Refresh analytics
      }

      if (result.failed > 0) {
        this.snackBar.open(`Failed to categorize ${result.failed} media items`, 'Close', { duration: 5000 });
      }
    } catch (error) {
      console.error('Error performing bulk categorize:', error);
      this.snackBar.open('Error performing bulk categorize', 'Close', { duration: 3000 });
    } finally {
      this.bulkOperationInProgress = false;
      this.bulkOperationProgress = 0;
    }
  }



  private async performCleanup(): Promise<void> {
    try {
      this.loading = true;
      const result = await this.mediaManagementService.cleanupOrphanedFiles();

      if (result.orphanedFilesRemoved > 0) {
        this.snackBar.open(`Cleaned up ${result.orphanedFilesRemoved} orphaned files`, 'Close', { duration: 3000 });
        await this.loadAnalytics(); // Refresh analytics
      } else {
        this.snackBar.open('No orphaned files found', 'Close', { duration: 3000 });
      }

      if (result.errors.length > 0) {
        this.snackBar.open(`Errors during cleanup: ${result.errors.length}`, 'Close', { duration: 5000 });
      }
    } catch (error) {
      console.error('Error performing cleanup:', error);
      this.snackBar.open('Error performing cleanup', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  private async performOptimization(): Promise<void> {
    try {
      this.loading = true;
      const result = await this.mediaManagementService.optimizeStorage();

      if (result.filesOptimized > 0) {
        this.snackBar.open(`Optimized ${result.filesOptimized} files`, 'Close', { duration: 3000 });
        await this.loadAnalytics(); // Refresh analytics
      } else {
        this.snackBar.open('No files needed optimization', 'Close', { duration: 3000 });
      }

      if (result.errors.length > 0) {
        this.snackBar.open(`Errors during optimization: ${result.errors.length}`, 'Close', { duration: 5000 });
      }
    } catch (error) {
      console.error('Error performing optimization:', error);
      this.snackBar.open('Error performing optimization', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  // Tab change handler
  onTabChange(index: number): void {
    // Handle tab changes if needed
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatPercentage(value: number): string {
    return value.toFixed(1) + '%';
  }

  // Helper methods for template
  getFileTypes(): string[] {
    if (!this.analytics) return [];
    return Object.keys(this.analytics.fileTypeDistribution);
  }

  getCategories(): string[] {
    if (!this.analytics) return [];
    return Object.keys(this.analytics.categoryDistribution);
  }

  getTypePercentage(type: string): number {
    if (!this.analytics) return 0;
    const total = this.analytics.totalFiles;
    const count = this.analytics.fileTypeDistribution[type];
    return total > 0 ? (count / total) * 100 : 0;
  }

  getCategoryPercentage(category: string): number {
    if (!this.analytics) return 0;
    const total = this.analytics.totalFiles;
    const count = this.analytics.categoryDistribution[category];
    return total > 0 ? (count / total) * 100 : 0;
  }
}

// Dialog components (simplified for now)
@Component({
  selector: 'app-confirm-bulk-delete-dialog',
  template: `
    <h2 mat-dialog-title>Confirm Bulk Delete</h2>
    <mat-dialog-content>
      <p>Are you sure you want to delete {{ data.count }} media items?</p>
      <p class="warning">This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Delete</button>
    </mat-dialog-actions>
  `
})
export class ConfirmBulkDeleteDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { count: number; mediaItems: MediaItem[] }) { }
}

@Component({
  selector: 'app-bulk-categorize-dialog',
  template: `
    <h2 mat-dialog-title>Bulk Categorize</h2>
    <mat-dialog-content>
      <p>Categorize {{ data.count }} selected media items:</p>
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Category</mat-label>
        <input matInput [(ngModel)]="category" placeholder="Enter category name">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="{ category }">Categorize</button>
    </mat-dialog-actions>
  `
})
export class BulkCategorizeDialogComponent {
  category = '';
  constructor(@Inject(MAT_DIALOG_DATA) public data: { count: number }) { }
}



@Component({
  selector: 'app-confirm-cleanup-dialog',
  template: `
    <h2 mat-dialog-title>Confirm {{ data.operation }}</h2>
    <mat-dialog-content>
      <p>Are you sure you want to perform {{ data.operation }}?</p>
      <p>This operation may take some time.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="true">Proceed</button>
    </mat-dialog-actions>
  `
})
export class ConfirmCleanupDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { operation: string }) { }
} 