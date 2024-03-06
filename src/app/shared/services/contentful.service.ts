import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class ContentfulService {
  private apiUrl = 'https://api.contentful.com/spaces/'+ environment.contentful.spaceId+'/environments/master/';
  constructor(private http: HttpClient) {}

  private getHeaders(contentType: string): HttpHeaders {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' +  environment.contentful.accessToken,
      'X-Contentful-Content-Type': contentType,
    });
    return headers;
  }
  createEntry(contentType: string, data: any): Observable<any> {
    const url = `${this.apiUrl}entries`;
    const headers = this.getHeaders(contentType);

    const options = { headers, params: { publish: 'true' } };

    return this.http.post(url, { fields: data }, options);
  }
}
