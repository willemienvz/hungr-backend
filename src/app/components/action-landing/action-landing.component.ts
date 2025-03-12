import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-action-landing',
  template: '',
})
export class ActionLandingComponent implements OnInit {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const mode = params['mode'];
      const oobCode = params['oobCode'];

      if (mode) {
        let newPath = '';
        switch (mode) {
          case 'verifyEmail':
            newPath = 'confirm-email';
            break;

          case 'resetPassword':
            newPath = 'reset-password';
            break;

          default:
            newPath = 'action-landing';
            break;
        }

        
        this.router.navigate([`/${newPath}`], {
          queryParams: params,
          queryParamsHandling: 'merge' 
        });
      }
    });
  }
}
