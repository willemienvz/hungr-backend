import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteQrComponent } from './delete-qr.component';

describe('DeleteQrComponent', () => {
  let component: DeleteQrComponent;
  let fixture: ComponentFixture<DeleteQrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeleteQrComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DeleteQrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
