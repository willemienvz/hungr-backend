import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesInsightsComponent } from './sales-insights.component';

describe('SalesInsightsComponent', () => {
  let component: SalesInsightsComponent;
  let fixture: ComponentFixture<SalesInsightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SalesInsightsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SalesInsightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
