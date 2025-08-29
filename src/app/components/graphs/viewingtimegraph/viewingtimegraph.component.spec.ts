import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewingtimegraphComponent } from './viewingtimegraph.component';

describe('ViewingtimegraphComponent', () => {
  let component: ViewingtimegraphComponent;
  let fixture: ComponentFixture<ViewingtimegraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViewingtimegraphComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ViewingtimegraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
