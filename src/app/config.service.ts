import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  numberOfTables: number = 20; 

  constructor() { }

  setNumberOfTables(num: number): void {
    this.numberOfTables = num;
  }
}
