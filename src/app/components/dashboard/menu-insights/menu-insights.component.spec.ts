import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuInsightsComponent } from './menu-insights.component';

describe('MenuInsightsComponent', () => {
  let component: MenuInsightsComponent;
  let fixture: ComponentFixture<MenuInsightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MenuInsightsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MenuInsightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
