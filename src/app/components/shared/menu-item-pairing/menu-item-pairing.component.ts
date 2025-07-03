import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, startWith, map } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MenuItemInterface } from '../../menus/shared/menu.service';

export interface PairingReference {
  id: string;
  name: string;
}

@Component({
  selector: 'app-menu-item-pairing',
  templateUrl: './menu-item-pairing.component.html',
  styleUrls: ['./menu-item-pairing.component.scss']
})
export class MenuItemPairingComponent implements OnInit, OnChanges {
  @Input() availableMenuItems: MenuItemInterface[] = [];
  @Input() selectedPairingIds: string[] = [];
  @Input() currentMenuItemId: string = '';
  
  @Output() closeDetail = new EventEmitter<void>();
  @Output() addPairing = new EventEmitter<string>();
  @Output() removePairing = new EventEmitter<string>();

  autocompleteControl = new FormControl('');
  filteredMenuItems: Observable<MenuItemInterface[]> = new Observable();
  selectedPairings: PairingReference[] = [];

  ngOnInit() {
    this.initializeSelectedPairings();
    this.setupAutocomplete();
    
    // Debug log to check if we have available menu items
    console.log('Available menu items for pairing:', this.availableMenuItems.length);
    console.log('Current menu item ID:', this.currentMenuItemId);
    console.log('Selected pairing IDs:', this.selectedPairingIds);
  }

  ngOnChanges(changes: SimpleChanges) {
    // Re-initialize when selectedPairingIds or availableMenuItems change
    if (changes['selectedPairingIds'] || changes['availableMenuItems']) {
      this.initializeSelectedPairings();
    }
  }

  private initializeSelectedPairings() {
    this.selectedPairings = this.selectedPairingIds
      .map(id => {
        const menuItem = this.availableMenuItems.find(item => item.itemId === id);
        return menuItem ? { id: menuItem.itemId, name: menuItem.name } : null;
      })
      .filter(pairing => pairing !== null) as PairingReference[];
  }

  private setupAutocomplete() {
    this.filteredMenuItems = this.autocompleteControl.valueChanges.pipe(
      startWith(''),
      map(value => this.filterMenuItems(value || ''))
    );
  }

  private filterMenuItems(value: string): MenuItemInterface[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : '';
    
    return this.availableMenuItems.filter(item => 
      // Must have a name
      item.name &&
      // Exclude the current menu item
      item.itemId !== this.currentMenuItemId &&
      // Exclude already selected pairings
      !this.selectedPairingIds.includes(item.itemId) &&
      // Filter by name (show all if no search term)
      (filterValue === '' || item.name.toLowerCase().includes(filterValue))
    );
  }

  onMenuItemSelected(event: MatAutocompleteSelectedEvent) {
    const selectedItem: MenuItemInterface = event.option.value;
    if (selectedItem && selectedItem.itemId) {
      console.log('Selected menu item for pairing:', selectedItem.name);
      // Only emit the event - let parent handle state management
      this.addPairing.emit(selectedItem.itemId);
      this.autocompleteControl.setValue('');
    }
  }

  onRemovePairing(pairingId: string) {
    console.log('Removing pairing:', pairingId);
    // Only emit the event - let parent handle state management
    this.removePairing.emit(pairingId);
  }

  onCloseDetail() {
    this.closeDetail.emit();
  }

  displayFn(menuItem: MenuItemInterface): string {
    return menuItem ? menuItem.name : '';
  }
} 