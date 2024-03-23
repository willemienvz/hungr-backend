import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, Event } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.setActiveMenu(event.urlAfterRedirects);
    });
  }

  setActiveMenu(url: string) {
    const links = document.querySelectorAll('.sidebar a');
    links.forEach(link => {
      const linkRoute = link.getAttribute('routerLink') || link.getAttribute('href');
      if (linkRoute === url) {
        link.classList.add('activeMenu');
      } else {
        link.classList.remove('activeMenu');
      }
    });
  }
}
