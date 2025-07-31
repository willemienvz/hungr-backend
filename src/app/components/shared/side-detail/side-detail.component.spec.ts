import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { SideDetailComponent } from './side-detail.component';
import { PriceInputComponent } from '../../../shared/components/price-input/price-input.component';

describe('SideDetailComponent', () => {
  let component: SideDetailComponent;
  let fixture: ComponentFixture<SideDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ 
        SideDetailComponent,
        PriceInputComponent
      ],
      imports: [FormsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SideDetailComponent);
    component = fixture.componentInstance;
    
    // Set up default config
    component.config = {
      title: 'Test Sides',
      placeholder: 'Add side',
      showPricing: true
    };
    
    component.sides = [];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the correct title', () => {
    const titleElement = fixture.nativeElement.querySelector('h6');
    expect(titleElement.textContent).toContain('Test Sides');
  });

  it('should have consistent styling with menu-item-detail pattern', () => {
    const detailsSection = fixture.nativeElement.querySelector('.details-section');
    expect(detailsSection).toBeTruthy();
    
    // Check for grid layout
    const gridElements = fixture.nativeElement.querySelectorAll('.grid');
    expect(gridElements.length).toBeGreaterThan(0);
    
    // Check for border-top styling
    const computedStyle = window.getComputedStyle(detailsSection);
    expect(computedStyle.borderTop).toContain('1px solid');
  });

  it('should show price input when showPricing is true', () => {
    component.config.showPricing = true;
    fixture.detectChanges();
    
    const priceInput = fixture.nativeElement.querySelector('.price-input-container');
    expect(priceInput).toBeTruthy();
  });

  it('should hide price input when showPricing is false', () => {
    component.config.showPricing = false;
    fixture.detectChanges();
    
    const priceInput = fixture.nativeElement.querySelector('.price-input-container');
    expect(priceInput).toBeFalsy();
  });

  it('should display sides in item-list', () => {
    component.sides = [
      { name: 'Fries', price: 'R 15.00' },
      { name: 'Salad', price: 'R 20.00' }
    ];
    fixture.detectChanges();
    
    const itemTags = fixture.nativeElement.querySelectorAll('.item-tag');
    expect(itemTags.length).toBe(2);
  });

  it('should emit closeDetail when close button is clicked', () => {
    spyOn(component.closeDetail, 'emit');
    const closeButton = fixture.nativeElement.querySelector('.toggle-btn');
    closeButton.click();
    
    expect(component.closeDetail.emit).toHaveBeenCalled();
  });

  it('should emit addSide when add button is clicked', () => {
    spyOn(component.addSide, 'emit');
    component.newSideName = 'New Side';
    component.newSidePrice = 'R 25.00';
    
    const addButton = fixture.nativeElement.querySelector('button[type="submit"]');
    if (addButton) {
      addButton.click();
      expect(component.addSide.emit).toHaveBeenCalledWith({
        name: 'New Side',
        price: 'R 25.00'
      });
    }
  });
}); 