import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Category } from '../models/category.model';
import { DocSettings, SavedColor } from '../models/email-doc.model';

// The server stores settings/savedColors as one JSON payload; `settings` can be
// null for categories created before the caller supplied defaults.
export interface CategoryResponse extends Omit<Category, 'settings'> {
  settings: DocSettings | null;
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

  create(name: string, settings: DocSettings, savedColors: SavedColor[]): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(`${environment.apiUrl}/categories`, { name, settings, savedColors });
  }

  update(id: string, name: string, settings: DocSettings, savedColors: SavedColor[]): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(`${environment.apiUrl}/categories/${encodeURIComponent(id)}`, { name, settings, savedColors });
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${environment.apiUrl}/categories/${encodeURIComponent(id)}`);
  }
}
