import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Asset {
  name: string;
  url: string;
  // 'category' = scoped to a category container; 'account' = the user-wide pool
  scope?: 'account' | 'category';
  size?: number;
  contentType?: string;
  lastModified?: string;
  width?: number;
  height?: number;
}

@Injectable({ providedIn: 'root' })
export class AssetsService {
  private http = inject(HttpClient);

  // With a categoryId, the upload lands in that category's shared asset scope and the
  // listing returns category assets plus the account pool.
  upload(file: File, categoryId?: string | null): Observable<Asset> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Asset>(`${environment.apiUrl}/assets`, formData, {
      params: categoryId ? { category: categoryId } : {},
    });
  }

  list(categoryId?: string | null): Observable<Asset[]> {
    return this.http
      .get<{ assets: Asset[] }>(`${environment.apiUrl}/assets`, { params: categoryId ? { category: categoryId } : {} })
      .pipe(map(res => res.assets));
  }

  delete(name: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${environment.apiUrl}/assets/${encodeURIComponent(name)}`);
  }
}
