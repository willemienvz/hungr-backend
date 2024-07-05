import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpecialsLandingComponent } from './specials-landing.component';

describe('SpecialsLandingComponent', () => {
  let component: SpecialsLandingComponent;
  let fixture: ComponentFixture<SpecialsLandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SpecialsLandingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SpecialsLandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
