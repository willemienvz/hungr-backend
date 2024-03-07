import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class ContentfulService {
  private apiUrl = 'https://api.contentful.com/spaces/'+ environment.contentful.spaceId+'/environments/master/';
  constructor(private http: HttpClient) {}

  private getHeaders(contentType: string, latestVersion?: number): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + environment.contentful.accessToken,
      'X-Contentful-Content-Type': contentType,
    });
  
    // Add X-Contentful-Version header if latestVersion is provided
    if (latestVersion !== undefined) {
      headers = headers.append('X-Contentful-Version', latestVersion.toString());
    }
  
    return headers;
  }

  createEntry(contentType: string, data: any): Observable<any> {
    const url = `${this.apiUrl}entries`;
    const headers = this.getHeaders(contentType);

    const options = { headers, params: { publish: 'true' } };

    return this.http.post(url, { fields: data }, { headers }).pipe(
      map((response: any) => {
        const entryId = response.sys.id;
        return entryId;
      })
    );
  }

  updateAndPublishEntry(entryId: string, contentType: string, data: any): Observable<any> {
    // Fetch the latest version of the entry to get the correct version number
    return this.getEntry(entryId, contentType).pipe(
      switchMap((entry) => {
        const latestVersion = entry.sys.version;

        // Use the correct version in the update request
        const url = `${this.apiUrl}entries/${entryId}`;
        const headers = this.getHeaders(contentType, latestVersion);

        // Include the "publish" parameter to publish the entry immediately
        const options = { headers, params: { publish: 'true' } };

        return this.http.put(url, { fields: data }, options);
      })
    );
  }

  // Example method to fetch the latest version of an entry
  private getEntry(entryId: string, contentType:string): Observable<any> {
    const url = `${this.apiUrl}entries/${entryId}`;
    const headers = this.getHeaders(contentType);

    return this.http.get(url, { headers });
  }
}
