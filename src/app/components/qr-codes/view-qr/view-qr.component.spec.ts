import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewQrComponent } from './view-qr.component';

describe('ViewQrComponent', () => {
  let component: ViewQrComponent;
  let fixture: ComponentFixture<ViewQrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViewQrComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ViewQrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
