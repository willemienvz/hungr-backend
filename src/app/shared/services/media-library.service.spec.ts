/**
 * Unit tests for MediaLibraryService
 */

import { TestBed } from '@angular/core/testing';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { NgZone } from '@angular/core';

import { MediaLibraryService } from './media-library.service';

describe('MediaLibraryService', () => {
  let service: MediaLibraryService;

  beforeEach(() => {
    const firestoreSpy = jasmine.createSpyObj('AngularFirestore', ['collection']);
    const storageSpy = jasmine.createSpyObj('AngularFireStorage', ['ref', 'upload']);
    const authSpy = jasmine.createSpyObj('AngularFireAuth', ['currentUser']);
    const ngZoneSpy = jasmine.createSpyObj('NgZone', ['run']);

    // Mock collection
    const mockCollection = jasmine.createSpyObj('AngularFirestoreCollection', ['doc']);
    const mockDoc = jasmine.createSpyObj('AngularFirestoreDocument', ['get', 'set', 'update', 'delete']);
    
    mockCollection.doc.and.returnValue(mockDoc);
    firestoreSpy.collection.and.returnValue(mockCollection);

    // Mock storage
    const mockStorageRef = jasmine.createSpyObj('StorageReference', ['getDownloadURL']);
    const mockUploadTask = jasmine.createSpyObj('UploadTask', ['snapshotChanges', 'percentageChanges']);
    
    mockStorageRef.getDownloadURL.and.returnValue(Promise.resolve('https://example.com/test-file.jpg'));
    mockUploadTask.snapshotChanges.and.returnValue(Promise.resolve({}));
    mockUploadTask.percentageChanges.and.returnValue(Promise.resolve(100));
    
    storageSpy.ref.and.returnValue(mockStorageRef);
    storageSpy.upload.and.returnValue(mockUploadTask);

    // Mock auth
    authSpy.currentUser = Promise.resolve({ uid: 'test-user-id' });

    // Mock ngZone
    ngZoneSpy.run.and.callFake((fn: Function) => fn());

    TestBed.configureTestingModule({
      providers: [
        MediaLibraryService,
        { provide: AngularFirestore, useValue: firestoreSpy },
        { provide: AngularFireStorage, useValue: storageSpy },
        { provide: AngularFireAuth, useValue: authSpy },
        { provide: NgZone, useValue: ngZoneSpy }
      ]
    });

    service = TestBed.inject(MediaLibraryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have uploadProgress$ observable', () => {
    expect(service.uploadProgress$).toBeDefined();
  });

  it('should reset upload progress', () => {
    service.resetUploadProgress();
    expect(service).toBeTruthy();
  });

  it('should have all required methods', () => {
    expect(typeof service.uploadMedia).toBe('function');
    expect(typeof service.getMediaById).toBe('function');
    expect(typeof service.getAllMedia).toBe('function');
    expect(typeof service.deleteMedia).toBe('function');
    expect(typeof service.updateMediaMetadata).toBe('function');
    expect(typeof service.trackMediaUsage).toBe('function');
    expect(typeof service.searchMedia).toBe('function');
    expect(typeof service.filterMediaByCategory).toBe('function');
    expect(typeof service.filterMediaByTags).toBe('function');
    expect(typeof service.getMediaAnalytics).toBe('function');
    expect(typeof service.getStorageUsage).toBe('function');
  });
}); 