import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Asset {
  name: string;
  url: string;
  size?: number;
  contentType?: string;
  lastModified?: string;
  width?: number;
  height?: number;
}

@Injectable({ providedIn: 'root' })
export class AssetsService {
  private http = inject(HttpClient);

  upload(file: File): Observable<Asset> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Asset>(`${environment.apiUrl}/assets`, formData);
  }

  list(): Observable<Asset[]> {
    return this.http
      .get<{ assets: Asset[] }>(`${environment.apiUrl}/assets`)
      .pipe(map(res => res.assets));
  }

  delete(name: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${environment.apiUrl}/assets/${encodeURIComponent(name)}`);
  }
}
