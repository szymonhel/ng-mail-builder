import { Injectable, signal } from '@angular/core';

export const PALETTE_LIST_ID = 'palette-drop-list';

@Injectable({ providedIn: 'root' })
export class DropListsService {
  private _columnIds = signal<string[]>([]);
  columnIds = this._columnIds.asReadonly();

  register(id: string) {
    this._columnIds.update(ids => (ids.includes(id) ? ids : [...ids, id]));
  }

  unregister(id: string) {
    this._columnIds.update(ids => ids.filter(i => i !== id));
  }
}
