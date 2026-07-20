import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Category, CategoryButtonDefaults, CategoryDataItem } from '../models/category.model';
import { DocSettings, SavedColor } from '../models/email-doc.model';

// The server stores the category defaults as one JSON payload; `settings` can be
// null for categories created before the caller supplied defaults.
export interface CategoryResponse extends Omit<Category, 'settings'> {
  settings: DocSettings | null;
}

// Everything a category persists besides its name; passed whole on create/update
// so adding a field can't silently drop another caller's data.
export interface CategoryPayload {
  settings: DocSettings;
  savedColors: SavedColor[];
  buttonDefaults?: CategoryButtonDefaults | null;
  globalData?: CategoryDataItem[];
  fromName?: string | null;
  fromEmail?: string | null;
}

@Service()
export class CategoriesService {
  private http = inject(HttpClient);

  list(): Observable<CategoryResponse[]> {
    return this.http
      .get<{ categories: CategoryResponse[] }>(`${environment.apiUrl}/categories`)
      .pipe(map(res => res.categories));
  }

  get(id: string): Observable<CategoryResponse> {
    return this.http.get<CategoryResponse>(`${environment.apiUrl}/categories/${encodeURIComponent(id)}`);
  }

  create(name: string, payload: CategoryPayload): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(`${environment.apiUrl}/categories`, { name, ...payload });
  }

  update(id: string, name: string, payload: CategoryPayload): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(`${environment.apiUrl}/categories/${encodeURIComponent(id)}`, { name, ...payload });
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${environment.apiUrl}/categories/${encodeURIComponent(id)}`);
  }
}
