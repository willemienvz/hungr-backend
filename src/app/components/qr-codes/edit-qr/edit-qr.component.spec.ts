import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditQrComponent } from './edit-qr.component';

describe('EditQrComponent', () => {
  let component: EditQrComponent;
  let fixture: ComponentFixture<EditQrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditQrComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditQrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
