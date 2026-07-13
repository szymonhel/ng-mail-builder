import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ApiKeyMeta {
  id: string;
  name: string;
  // First characters of the key (e.g. "mbk_a1b2c3d4") — the only part ever shown again.
  prefix: string;
  // The category container this key is scoped to (it can only send that category's emails).
  categoryId: string;
  createdAt?: string;
  lastUsedAt?: string;
}

// Returned once, at creation: the full plaintext key.
export interface CreatedApiKey extends ApiKeyMeta {
  key: string;
}

@Injectable({ providedIn: 'root' })
export class ApiKeysService {
  private http = inject(HttpClient);

  list(categoryId?: string): Observable<ApiKeyMeta[]> {
    return this.http
      .get<{ keys: ApiKeyMeta[] }>(`${environment.apiUrl}/apikeys`, { params: categoryId ? { category: categoryId } : {} })
      .pipe(map(res => res.keys));
  }

  create(name: string, categoryId: string): Observable<CreatedApiKey> {
    return this.http.post<CreatedApiKey>(`${environment.apiUrl}/apikeys`, { name, categoryId });
  }

  revoke(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${environment.apiUrl}/apikeys/${encodeURIComponent(id)}`);
  }
}
