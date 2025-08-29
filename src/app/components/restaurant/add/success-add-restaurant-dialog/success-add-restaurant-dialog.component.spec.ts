import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuccessAddRestaurantDialogComponent } from './success-add-restaurant-dialog.component';

describe('SuccessAddRestaurantDialogComponent', () => {
  let component: SuccessAddRestaurantDialogComponent;
  let fixture: ComponentFixture<SuccessAddRestaurantDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SuccessAddRestaurantDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SuccessAddRestaurantDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
