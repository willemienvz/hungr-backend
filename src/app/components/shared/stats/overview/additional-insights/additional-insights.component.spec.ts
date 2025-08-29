import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdditionalInsightsComponent } from './additional-insights.component';

describe('AdditionalInsightsComponent', () => {
  let component: AdditionalInsightsComponent;
  let fixture: ComponentFixture<AdditionalInsightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdditionalInsightsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdditionalInsightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
