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
    { question: 'How to upload my logo?', isOpen: false, answer: 'A step-by-step explanation. Lorem ipsum dolor sit amet. Non quaerat quod ex numquam commodi st incidunt quia nam maiores ratione ut fuga sint vel iste modi cum molestiae excepturi.' },
    { question: 'How do I edit an icon?', isOpen: false, answer: 'A step-by-step explanation. Lorem ipsum dolor sit amet. Non quaerat quod ex numquam commodi st incidunt quia nam maiores ratione ut fuga sint vel iste modi cum molestiae excepturi.' },
    { question: 'How do I edit a list?', isOpen: false, answer: 'A step-by-step explanation. Lorem ipsum dolor sit amet. Non quaerat quod ex numquam commodi st incidunt quia nam maiores ratione ut fuga sint vel iste modi cum molestiae excepturi.' },
    { question: 'How do I edit a book?', isOpen: false, answer: 'A step-by-step explanation. Lorem ipsum dolor sit amet. Non quaerat quod ex numquam commodi st incidunt quia nam maiores ratione ut fuga sint vel iste modi cum molestiae excepturi.' },
    { question: 'How do I upload a logo?', isOpen: false, answer: 'A step-by-step explanation. Lorem ipsum dolor sit amet. Non quaerat quod ex numquam commodi st incidunt quia nam maiores ratione ut fuga sint vel iste modi cum molestiae excepturi.' },
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
toggleFaq(index: number) {
    this.filteredFaqs.forEach((faq, i) => {
      if (i === index) {
        faq.isOpen = !faq.isOpen; 
      } else {
        faq.isOpen = false; 
      }
    });
  }

  showFaqContent(stringName: string, event?: Event){
    if (event) {
      event.preventDefault();
    }
    this.searchTerm = stringName;
    this.filterFaqs();
    // Open the first matching FAQ if found
    setTimeout(() => {
      const matchingFaq = this.filteredFaqs.find(faq => 
        faq.question.toLowerCase().includes(stringName.toLowerCase())
      );
      if (matchingFaq) {
        const index = this.filteredFaqs.indexOf(matchingFaq);
        this.toggleFaq(index);
      }
    }, 0);
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
  clearSearch(){
    this.searchTerm = '';
    this.filterFaqs();
  }
}
