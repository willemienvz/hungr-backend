import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveProgressDialogComponent } from './save-progress-dialog.component';

describe('SaveProgressDialogComponent', () => {
  let component: SaveProgressDialogComponent;
  let fixture: ComponentFixture<SaveProgressDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SaveProgressDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SaveProgressDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
