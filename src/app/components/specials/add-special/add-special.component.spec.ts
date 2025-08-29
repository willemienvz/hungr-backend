import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSpecialComponent } from './add-special.component';

describe('AddSpecialComponent', () => {
  let component: AddSpecialComponent;
  let fixture: ComponentFixture<AddSpecialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddSpecialComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddSpecialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
