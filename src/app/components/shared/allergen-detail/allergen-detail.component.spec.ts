import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { AllergenDetailComponent } from './allergen-detail.component';

describe('AllergenDetailComponent', () => {
  let component: AllergenDetailComponent;
  let fixture: ComponentFixture<AllergenDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AllergenDetailComponent ],
      imports: [FormsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllergenDetailComponent);
    component = fixture.componentInstance;
    
    // Set up default config
    component.config = {
      title: 'Test Allergens',
      placeholder: 'Add allergen'
    };
    
    component.allergens = [];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the correct title', () => {
    const titleElement = fixture.nativeElement.querySelector('h6');
    expect(titleElement.textContent).toContain('Test Allergens');
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

  it('should display allergens in item-list', () => {
    component.allergens = ['Nuts', 'Dairy', 'Gluten'];
    fixture.detectChanges();
    
    const itemTags = fixture.nativeElement.querySelectorAll('.item-tag');
    expect(itemTags.length).toBe(3);
  });

  it('should emit closeDetail when close button is clicked', () => {
    spyOn(component.closeDetail, 'emit');
    const closeButton = fixture.nativeElement.querySelector('.toggle-btn');
    closeButton.click();
    
    expect(component.closeDetail.emit).toHaveBeenCalled();
  });

  it('should emit addAllergen when enter is pressed in input', () => {
    spyOn(component.addAllergen, 'emit');
    component.newAllergen = 'New Allergen';
    
    const input = fixture.nativeElement.querySelector('input');
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    
    expect(component.addAllergen.emit).toHaveBeenCalled();
  });

  it('should emit removeAllergen when remove button is clicked', () => {
    component.allergens = ['Nuts', 'Dairy'];
    fixture.detectChanges();
    
    spyOn(component.removeAllergen, 'emit');
    const removeButtons = fixture.nativeElement.querySelectorAll('.remove-btn');
    removeButtons[0].click();
    
    expect(component.removeAllergen.emit).toHaveBeenCalledWith(0);
  });

  it('should update newAllergen value when input changes', () => {
    const input = fixture.nativeElement.querySelector('input');
    input.value = 'Test Allergen';
    input.dispatchEvent(new Event('input'));
    
    expect(component.newAllergen).toBe('Test Allergen');
  });

  it('should have proper CSS classes for styling consistency', () => {
    const detailsSection = fixture.nativeElement.querySelector('.details-section');
    const detailHeader = fixture.nativeElement.querySelector('.detail-header');
    const detailContent = fixture.nativeElement.querySelector('.detail-content');
    
    expect(detailsSection).toHaveClass('details-section');
    expect(detailHeader).toHaveClass('detail-header');
    expect(detailContent).toHaveClass('detail-content');
  });
}); 