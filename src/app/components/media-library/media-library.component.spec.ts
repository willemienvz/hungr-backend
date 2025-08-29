import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MediaLibraryComponent } from './media-library.component';
import { MediaLibraryService } from '../../shared/services/media-library.service';
import { FileSizePipe } from '../../shared/pipes/file-size.pipe';

describe('MediaLibraryComponent', () => {
  let component: MediaLibraryComponent;
  let fixture: ComponentFixture<MediaLibraryComponent>;
  let mockMediaLibraryService: jasmine.SpyObj<MediaLibraryService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('MediaLibraryService', ['getAllMedia', 'deleteMedia']);

    await TestBed.configureTestingModule({
      declarations: [
        MediaLibraryComponent,
        FileSizePipe
      ],
      imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonToggleModule,
        MatChipsModule,
        MatIconModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: MediaLibraryService, useValue: spy }
      ]
    }).compileComponents();

    mockMediaLibraryService = TestBed.inject(MediaLibraryService) as jasmine.SpyObj<MediaLibraryService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MediaLibraryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.viewMode).toBe('grid');
    expect(component.sortBy).toBe('uploadedAt');
    expect(component.sortOrder).toBe('desc');
    expect(component.currentPage).toBe(1);
    expect(component.itemsPerPage).toBe(20);
  });

  it('should have search control initialized', () => {
    expect(component.searchControl).toBeDefined();
  });

  it('should change view mode', () => {
    const event = { value: 'list' };
    component.changeViewMode(event);
    expect(component.viewMode).toBe('list');
  });

  it('should handle image error', () => {
    const mockEvent = {
      target: {
        style: {
          display: 'none'
        }
      }
    };
    
    component.onImageError(mockEvent);
    
    expect(mockEvent.target.style.display).toBe('none');
  });

  it('should clear filters', () => {
    component.searchControl.setValue('test');
    component.selectedCategory = 'test-category';
    component.selectedTags = ['test-tag'];
    
    component.clearFilters();
    
    expect(component.searchQuery).toBe('');
    expect(component.selectedCategory).toBe('');
    expect(component.selectedTags).toEqual([]);
  });

  it('should detect active filters', () => {
    expect(component.hasActiveFilters).toBe(false);
    
    component.searchControl.setValue('test');
    expect(component.hasActiveFilters).toBe(true);
    
    component.searchControl.setValue('');
    component.selectedCategory = 'test';
    expect(component.hasActiveFilters).toBe(true);
    
    component.selectedCategory = '';
    component.selectedTags = ['test'];
    expect(component.hasActiveFilters).toBe(true);
  });
}); 