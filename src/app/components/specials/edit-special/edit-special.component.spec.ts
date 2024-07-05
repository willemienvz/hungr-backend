import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditSpecialComponent } from './edit-special.component';

describe('EditSpecialComponent', () => {
  let component: EditSpecialComponent;
  let fixture: ComponentFixture<EditSpecialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditSpecialComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditSpecialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
