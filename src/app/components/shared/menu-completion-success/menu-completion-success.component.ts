import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-menu-completion-success',
  templateUrl: './menu-completion-success.component.html',
  styleUrls: ['./menu-completion-success.component.scss']
})
export class MenuCompletionSuccessComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('previewIframe') previewIframe: ElementRef;

  // Display control inputs
  @Input() showBackButton: boolean = true;
  @Input() showSaveDraft: boolean = true;
  @Input() showPublishMenu: boolean = true;

  // Route inputs
  @Input() backRoute: string = '/menus';
  @Input() menuId: string = '';

  // State inputs
  @Input() isSaving: boolean = false;
  @Input() isMenuPublished: boolean = false;

  // Event outputs
  @Output() saveAsDraft = new EventEmitter<void>();
  @Output() publishMenu = new EventEmitter<void>();

  // Preview URL - directly for the current menu
  public previewUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
  public qrCodeData: string = '';
  public qrCodeDownloadLink: SafeUrl = "";

  constructor(
    private router: Router,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    // Initialize QR code data and preview URL
    this.updateQRCodeData();
    this.updatePreviewUrl();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Update preview and QR code when menuId input changes
    if (changes['menuId'] && changes['menuId'].currentValue) {
      this.updatePreviewUrl();
      this.updateQRCodeData();
    }
  }

  ngOnDestroy() {
    // Component cleanup - no subscriptions to clean up anymore
  }

  updatePreviewUrl(): void {
    if (this.menuId) {
      const url = environment.menuUrl + this.menuId;
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } else {
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
    }
  }

  updateQRCodeData(): void {
    if (this.menuId) {
      const fullUrl = environment.menuUrl + this.menuId;
      this.qrCodeData = fullUrl;
      this.qrCodeDownloadLink = fullUrl;
    } else {
      this.qrCodeData = '';
      this.qrCodeDownloadLink = '';
    }
  }

  onChangeURL(url: SafeUrl) {
    this.qrCodeDownloadLink = url;
  }

  downloadQRCode() {
    const qrElement = document.querySelector('qrcode canvas') as HTMLCanvasElement;
    
    if (qrElement) {
      const imageUrl = qrElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'qrcode.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error("QR code canvas not found!");
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