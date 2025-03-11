import { TestBed } from '@angular/core/testing';

import { PayflexService } from './payflex.service';

describe('PayflexService', () => {
  let service: PayflexService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PayflexService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
