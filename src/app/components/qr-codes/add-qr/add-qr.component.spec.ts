import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddQrComponent } from './add-qr.component';

describe('AddQrComponent', () => {
  let component: AddQrComponent;
  let fixture: ComponentFixture<AddQrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddQrComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddQrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
