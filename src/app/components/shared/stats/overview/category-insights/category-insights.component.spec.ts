import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryInsightsComponent } from './category-insights.component';

describe('CategoryInsightsComponent', () => {
  let component: CategoryInsightsComponent;
  let fixture: ComponentFixture<CategoryInsightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CategoryInsightsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CategoryInsightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
