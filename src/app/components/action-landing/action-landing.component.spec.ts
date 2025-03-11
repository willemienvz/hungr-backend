import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionLandingComponent } from './action-landing.component';

describe('ActionLandingComponent', () => {
  let component: ActionLandingComponent;
  let fixture: ComponentFixture<ActionLandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ActionLandingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ActionLandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
