import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { BlockPreset } from '../models/block-preset.model';
import { Block, Row } from '../models/email-doc.model';

@Injectable({ providedIn: 'root' })
export class BlockPresetsService {
  private http = inject(HttpClient);

  // Bumped after create/update/delete so any list() consumer (e.g. the palette's
  // "Presets" tab) can react as an effect dependency, even though the write happened
  // through an unrelated component (the save dialog).
  private _changed = signal(0);
  changed = this._changed.asReadonly();

  // With a categoryId, returns personal presets plus that category's; without one,
  // returns personal presets only.
  list(categoryId?: string | null): Observable<BlockPreset[]> {
    return this.http
      .get<{ presets: BlockPreset[] }>(`${environment.apiUrl}/block-presets`, {
        params: categoryId ? { categoryId } : {},
      })
      .pipe(map(res => res.presets));
  }

  create(name: string, kind: 'row' | 'block', payload: Row | Block, categoryId: string | null): Observable<BlockPreset> {
    return this.http
      .post<BlockPreset>(`${environment.apiUrl}/block-presets`, { name, kind, payload, categoryId })
      .pipe(tap(() => this._changed.update(v => v + 1)));
  }

  update(id: string, name: string, payload: Row | Block, categoryId?: string | null): Observable<BlockPreset> {
    const body: Record<string, unknown> = { name, payload };
    if (categoryId !== undefined) body['categoryId'] = categoryId;
    return this.http
      .put<BlockPreset>(`${environment.apiUrl}/block-presets/${encodeURIComponent(id)}`, body)
      .pipe(tap(() => this._changed.update(v => v + 1)));
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http
      .delete<{ success: boolean }>(`${environment.apiUrl}/block-presets/${encodeURIComponent(id)}`)
      .pipe(tap(() => this._changed.update(v => v + 1)));
  }
}
