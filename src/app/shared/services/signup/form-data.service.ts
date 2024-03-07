import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FormDataService {
  private formData = new BehaviorSubject<any>({});
  currentFormData = this.formData.asObservable();

  updateFormData(data: any) {
    this.formData.next(data);
  }

  getFormData(): any {
    return this.formData.value;
  }
}
