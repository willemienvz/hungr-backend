import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MenuService, MenuItemInterface } from '../../menus/shared/menu.service';
import { Category } from '../../../shared/services/category';

@Component({
  selector: 'app-menu-item-selection',
  templateUrl: './menu-item-selection.component.html',
  styleUrls: ['./menu-item-selection.component.scss']
})
export class MenuItemSelectionComponent {

  @Input() existingMenuItems: MenuItemInterface[] = [];
  @Input() categories: Category[] = [];
  @Output() bulkUploadClick = new EventEmitter<void>();
  @Output() manualAddClick = new EventEmitter<void>();
  @Output() stepClick = new EventEmitter<number>();
  @Output() menuItemsUploaded = new EventEmitter<{items: MenuItemInterface[], replaceExisting: boolean}>();

  /* KB - Added popup states for bulk upload functionality */
  showUploadModal: boolean = false;
  showSuccessModal: boolean = false;
  showChoiceModal: boolean = false;
  showPreviewModal: boolean = false;
  
  /* KB - File upload state */
  selectedFile: File | null = null;
  parsedMenuItems: MenuItemInterface[] = [];
  isProcessingFile: boolean = false;
  validationErrors: string[] = [];

  constructor(private menuService: MenuService) {}

  onBulkUploadClick() {
    /* KB - Open upload modal instead of emitting event */
    this.showUploadModal = true;
  }

  onManualAddClick() {
    this.manualAddClick.emit();
  }

  onStepClick(step: number) {
    this.stepClick.emit(step);
  }

  /* KB - Modal control methods */
  closeUploadModal() {
    this.showUploadModal = false;
    this.selectedFile = null;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
  }

  closeChoiceModal() {
    this.showChoiceModal = false;
    this.parsedMenuItems = [];
    this.selectedFile = null;
  }

  closePreviewModal() {
    this.showPreviewModal = false;
  }

  /* KB - Handle file selection */
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.processFile(file);
    }
  }

  /* KB - Process the selected file */
  processFile(file: File) {
    this.isProcessingFile = true;
    this.validationErrors = [];
    
    this.menuService.parseMenuFile(file, this.categories)
      .then((parsedItems: MenuItemInterface[]) => {
        this.parsedMenuItems = parsedItems;
        this.isProcessingFile = false;
        this.showUploadModal = false;

        // Show preview modal
        this.showPreviewModal = true;
      })
      .catch((error) => {
        console.error('Error processing file:', error);
        this.isProcessingFile = false;
        // Error toast is already shown by the service
      });
  }

  /* KB - Handle replace choice */
  onReplaceExisting() {
    this.finishUpload(true);
  }

  /* KB - Handle append choice */
  onAppendToExisting() {
    this.finishUpload(false);
  }

  /* KB - Finish upload process */
  finishUpload(replaceExisting: boolean) {
    this.showChoiceModal = false;
    this.showSuccessModal = true;
    
    // Emit the parsed menu items to parent component
    this.menuItemsUploaded.emit({
      items: this.parsedMenuItems,
      replaceExisting: replaceExisting
    });

    // Clear state
    this.parsedMenuItems = [];
    this.selectedFile = null;
  }

  /* KB - Handle template download */
  onDownloadTemplate() {
    // Pass existing menu items and categories to the service
    this.menuService.downloadTemplate(this.existingMenuItems, this.categories);
  }

  /* KB - Handle save as draft from upload modal */
  onSaveAsDraft() {
    this.showUploadModal = false;
    // TODO: Implement save as draft logic
    console.log('Save as draft clicked');
  }

  /* KB - Handle preview confirmation */
  confirmImport() {
    this.showPreviewModal = false;
    
    // If there are existing items, show choice modal
    if (this.existingMenuItems.length > 0) {
      this.showChoiceModal = true;
    } else {
      // No existing items, just add the new ones
      this.finishUpload(false);
    }
  }

  /* KB - Cancel import from preview */
  cancelImport() {
    this.showPreviewModal = false;
    this.parsedMenuItems = [];
    this.selectedFile = null;
  }

  /* KB - Getter methods for preview statistics */
  get itemsWithPreparations(): number {
    return this.parsedMenuItems.filter(item => item.preparations.length > 0).length;
  }

  get itemsWithVariations(): number {
    return this.parsedMenuItems.filter(item => item.variations.length > 0).length;
  }

  get itemsWithImages(): number {
    return this.parsedMenuItems.filter(item => item.imageUrls.length > 0).length;
  }
} 