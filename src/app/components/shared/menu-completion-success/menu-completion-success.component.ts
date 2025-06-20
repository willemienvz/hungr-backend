import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-completion-success',
  templateUrl: './menu-completion-success.component.html',
  styleUrls: ['./menu-completion-success.component.scss']
})
export class MenuCompletionSuccessComponent {
  // Display control inputs
  @Input() showBackButton: boolean = true;
  @Input() showSaveDraft: boolean = true;
  @Input() showPublishMenu: boolean = true;

  // Route inputs
  @Input() backRoute: string = '/menus';
  @Input() menuId: string = '';

  // State inputs
  @Input() isSaving: boolean = false;

  // Event outputs
  @Output() saveAsDraft = new EventEmitter<void>();
  @Output() publishMenu = new EventEmitter<void>();

  constructor(private router: Router) { }

  onGenerateQRCode() {
    if (this.menuId) {
      this.router.navigate(['/qr-codes']);
    }
  }

  onSaveAsDraft() {
    this.saveAsDraft.emit();
    // Navigate to menus page after saving as draft
    setTimeout(() => {
      this.router.navigate(['/menus']);
    }, 1000); // Small delay to allow save operation to complete
  }

  onPublishMenu() {
    this.publishMenu.emit();
    // Navigate to menus page after publishing
    setTimeout(() => {
      this.router.navigate(['/menus']);
    }, 1000); // Small delay to allow publish operation to complete
  }
} 