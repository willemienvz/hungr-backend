import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormDataService } from '../../../shared/services/signup/form-data.service';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrl: './step2.component.scss'
})
export class Step2Component {
  step2Form: FormGroup;


  @Output() previous: EventEmitter<void> = new EventEmitter<void>();


  constructor(private fb: FormBuilder, private formDataService: FormDataService) {
    this.step2Form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required]
    });
  }

  ngOnInit(): void {
 
  }
  onPrevious() {
    this.previous.emit();
  }
  onComplete() {
  }
}
