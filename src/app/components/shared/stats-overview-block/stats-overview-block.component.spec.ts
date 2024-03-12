import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatsOverviewBlockComponent } from './stats-overview-block.component';

describe('StatsOverviewBlockComponent', () => {
  let component: StatsOverviewBlockComponent;
  let fixture: ComponentFixture<StatsOverviewBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StatsOverviewBlockComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StatsOverviewBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
