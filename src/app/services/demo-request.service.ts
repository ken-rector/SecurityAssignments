import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../api.config';
import { DemoRequestSaveRequest } from '../models/demo-request.model';

@Injectable({ providedIn: 'root' })
export class DemoRequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_CONFIG.apiUrl}api/demorequest`;

  save(request: DemoRequestSaveRequest): Observable<{ demoRequestID: number }> {
    return this.http.post<{ demoRequestID: number }>(this.baseUrl, request);
  }
}
