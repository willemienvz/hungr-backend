import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatsTableBlockComponent } from './stats-table-block.component';

describe('StatsTableBlockComponent', () => {
  let component: StatsTableBlockComponent;
  let fixture: ComponentFixture<StatsTableBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StatsTableBlockComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StatsTableBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
