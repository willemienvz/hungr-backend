import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MediaItem } from '../../types/media';

export interface MediaPreviewDialogData {
  media: MediaItem;
}

@Component({
  selector: 'app-media-preview-dialog',
  templateUrl: './media-preview-dialog.component.html',
  styleUrls: ['./media-preview-dialog.component.scss']
})
export class MediaPreviewDialogComponent {
  
  constructor(
    public dialogRef: MatDialogRef<MediaPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MediaPreviewDialogData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  onDelete(): void {
    this.dialogRef.close('delete');
  }

  getFileTypeLabel(): string {
    const type = this.data.media.mimeType || '';
    if (type.startsWith('image/')) {
      return 'Image';
    } else if (type.startsWith('video/')) {
      return 'Video';
    } else if (type.startsWith('audio/')) {
      return 'Audio';
    } else {
      return 'File';
    }
  }

  getImageDimensions(): string {
    // For now, return unknown since MediaItem doesn't have width/height properties
    // This could be enhanced later to extract dimensions from the image
    return 'Unknown';
  }
} 