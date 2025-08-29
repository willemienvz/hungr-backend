import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-tutorials',
  templateUrl: './tutorials.component.html',
  styleUrl: './tutorials.component.scss'
})
export class TutorialsComponent {
  showvideoModal: boolean = false;
  videoUrl: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
  }


  openvideoModal() {
    this.showvideoModal = true;
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/EngW7tLk6R8');
  }

  closevideoModal() {
    this.showvideoModal = false;
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

}
