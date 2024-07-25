import { Component, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss'
})
export class HelpComponent {
  showvideoModal: boolean = false;
  videoUrl: SafeResourceUrl;
  selectedFaq: boolean = false;
  selectedFaqOption: any = null;
  searchTerm: string = '';

  faqs = [
    { question: 'How do I edit a menu?' },
    { question: 'How do I edit a icon?' },
    { question: 'How do I edit a list?' },
    { question: 'How do I edit a list?' },
    { question: 'How do I edit a icon?' },
    { question: 'How do I edit a book?' },
    { question: 'How do I edit a menu?' },
  ];
  filteredFaqs = this.faqs;
  constructor(private sanitizer: DomSanitizer) {
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

  filterFaqs() {
    if (this.searchTerm) {
      this.filteredFaqs = this.faqs.filter(faq => 
        faq.question.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredFaqs = this.faqs;
    }
  }


  showFaqContent(index:number){
    this.selectedFaq = true;
  }

  closeFaqContent(){
    this.selectedFaq = false;
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
