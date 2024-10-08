import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitorDashboardComponent } from './visitor-dashboard.component';

describe('VisitorDashboardComponent', () => {
  let component: VisitorDashboardComponent;
  let fixture: ComponentFixture<VisitorDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VisitorDashboardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VisitorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
