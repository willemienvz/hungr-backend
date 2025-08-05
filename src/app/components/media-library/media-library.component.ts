/**
 * Media Library Component
 * 
 * Main component for managing and displaying media items in a centralized location.
 * Provides grid/list views, filtering, search, and organization features.
 */

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { MediaLibraryService } from '../../shared/services/media-library.service';
import { MediaItem, MediaFilters } from '../../shared/types/media';
import { DeleteConfirmationModalComponent } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { MediaPreviewDialogComponent } from '../../shared/components/media-preview-dialog/media-preview-dialog.component';
import { MediaUploadModalService } from '../../shared/services/media-upload-modal.service';

@Component({
  selector: 'app-media-library',
  templateUrl: './media-library.component.html',
  styleUrls: ['./media-library.component.scss']
})
export class MediaLibraryComponent implements OnInit, OnDestroy {
  // Media data
  mediaItems: MediaItem[] = [];
  filteredMedia: MediaItem[] = [];
  loading = false;
  error: string | null = null;
  
  // Filter and search properties
  searchControl = new FormControl('');
  selectedCategory = '';
  sortBy = 'uploadedAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  viewMode: 'grid' | 'list' = 'grid';
  
  // Pagination properties
  currentPage = 1;
  itemsPerPage = 20;
  totalItems = 0;
  
  // Available options for filters
  categories: string[] = [];
  
  // Sort options
  sortOptions = [
    { value: 'uploadedAt', label: 'Upload Date' },
    { value: 'fileName', label: 'File Name' },
    { value: 'fileSize', label: 'File Size' },
    { value: 'originalName', label: 'Original Name' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private mediaLibraryService: MediaLibraryService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private mediaUploadModalService: MediaUploadModalService
  ) {}

  ngOnInit(): void {
    this.setupSearchSubscription();
    this.loadMedia();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Sets up search subscription with debouncing
   */
  private setupSearchSubscription(): void {
    this.searchControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(query => {
        this.searchQuery = query || '';
        this.applyFilters();
      });
  }

  /**
   * Loads media items from the service
   */
  async loadMedia(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;

      const filters: MediaFilters = {
        pagination: {
          page: this.currentPage - 1,
          limit: this.itemsPerPage
        }
      };

      this.mediaItems = await this.mediaLibraryService.getAllMedia(filters);
      this.filteredMedia = [...this.mediaItems];
      this.totalItems = this.mediaItems.length;

      // Extract unique categories and tags
      this.extractFilterOptions();

      this.applyFilters();
    } catch (error) {
      this.error = 'Failed to load media library. Please try again.';
      console.error('Error loading media:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Extracts unique categories from media items
   */
  private extractFilterOptions(): void {
    const categorySet = new Set<string>();

    this.mediaItems.forEach(item => {
      if (item.category) {
        categorySet.add(item.category);
      }
    });

    this.categories = Array.from(categorySet).sort();
  }

  /**
   * Applies current filters and search to media items
   */
  applyFilters(): void {
    let filtered = [...this.mediaItems];

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.fileName.toLowerCase().includes(query) ||
        item.originalName.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(item => item.category === this.selectedCategory);
    }

    // Apply sorting
    this.sortMediaItems(filtered);

    this.filteredMedia = filtered;
    this.totalItems = filtered.length;
    this.cdr.detectChanges();
  }

  /**
   * Sorts media items based on current sort settings
   */
  private sortMediaItems(items: MediaItem[]): void {
    items.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortBy) {
        case 'uploadedAt':
          aValue = a.uploadedAt.getTime();
          bValue = b.uploadedAt.getTime();
          break;
        case 'fileName':
          aValue = a.fileName.toLowerCase();
          bValue = b.fileName.toLowerCase();
          break;
        case 'fileSize':
          aValue = a.fileSize;
          bValue = b.fileSize;
          break;
        case 'originalName':
          aValue = a.originalName.toLowerCase();
          bValue = b.originalName.toLowerCase();
          break;
        default:
          aValue = a.uploadedAt.getTime();
          bValue = b.uploadedAt.getTime();
      }

      if (this.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  /**
   * Handles search query changes
   */
  onSearchChanged(query: string): void {
    this.searchQuery = query;
    this.applyFilters();
  }

  /**
   * Handles filter changes
   */
  onFiltersChanged(filters: any): void {
    this.selectedCategory = filters.category || '';
    this.applyFilters();
  }

  /**
   * Handles category filter change
   */
  onCategoryChange(event: any): void {
    this.selectedCategory = event.target.value;
    this.applyFilters();
  }



  /**
   * Handles sort change
   */
  onSortChange(event: any): void {
    this.sortBy = event.target.value;
    this.applyFilters();
  }

  /**
   * Handles sort changes
   */
  onSortChanged(): void {
    this.applyFilters();
  }

  /**
   * Changes the view mode between grid and list
   */
  changeViewMode(event: any): void {
    this.viewMode = event.value;
  }

  /**
   * Handles media item selection
   */
  onMediaSelect(media: MediaItem): void {
    this.openMediaPreviewDialog(media);
  }

  /**
   * Opens the media preview dialog
   */
  openMediaPreviewDialog(media: MediaItem): void {
    const dialogRef = this.dialog.open(MediaPreviewDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: 'media-preview-dialog-panel',
      data: { media }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'delete') {
        // Handle delete from preview dialog
        this.onMediaDelete(media);
      }
    });
  }

  /**
   * Handles media item deletion
   */
  async onMediaDelete(media: MediaItem): Promise<void> {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent, {
      width: '450px',
      panelClass: 'delete-confirmation-modal-panel',
      data: {
        title: 'Delete Media Item',
        itemName: media.originalName,
        itemType: 'media item',
        message: media.usage.length > 0 
          ? `Are you sure you want to delete "${media.originalName}"? This will also remove it from ${media.usage.length} component(s) where it's currently being used. This action cannot be undone.`
          : `Are you sure you want to delete "${media.originalName}"? This action cannot be undone.`,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.mediaLibraryService.deleteMedia(media.id);
          
          // Remove from local arrays
          this.mediaItems = this.mediaItems.filter(item => item.id !== media.id);
          this.filteredMedia = this.filteredMedia.filter(item => item.id !== media.id);
          
          // Re-extract filter options
          this.extractFilterOptions();
          
          this.cdr.detectChanges();
        } catch (error) {
          console.error('Error deleting media:', error);
          
          // Provide error message
          let errorMessage = 'Failed to delete media item. Please try again.';
          
          if (error instanceof Error) {
            if (error.message.includes('not found')) {
              errorMessage = 'Media item not found. It may have already been deleted.';
            } else if (error.message.includes('authenticated')) {
              errorMessage = 'You must be logged in to delete media items.';
            }
          }
          
          alert(errorMessage);
        }
      }
    });
  }

  /**
   * Handles page changes for pagination
   */
  onPageChange(event: any): void {
    this.currentPage = event.pageIndex + 1;
    this.itemsPerPage = event.pageSize;
    this.loadMedia();
  }

  /**
   * Opens the upload modal
   */
  openUploadModal(): void {
    const dialogRef = this.mediaUploadModalService.openUploadModal({
      componentType: 'media-library',
      componentId: 'media-library-upload',
      fieldName: 'media',
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowMultiple: true,
      maxFiles: 10
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.success) {
        // Refresh the media library after successful upload
        this.loadMedia();
      }
    });
  }

  /**
   * Clears all filters
   */
  clearFilters(): void {
    this.searchControl.setValue('');
    this.selectedCategory = '';
    this.applyFilters();
  }

  /**
   * Gets the search query value
   */
  get searchQuery(): string {
    return this.searchControl.value || '';
  }

  /**
   * Sets the search query value
   */
  set searchQuery(value: string) {
    this.searchControl.setValue(value);
  }

  /**
   * Gets the total number of pages
   */
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  /**
   * Checks if there are any active filters
   */
  get hasActiveFilters(): boolean {
    return !!this.searchQuery || !!this.selectedCategory;
  }

  /**
   * Handles image loading errors
   */
  onImageError(event: any): void {
    if (event.target) {
      event.target.style.display = 'none';
    }
  }
} 