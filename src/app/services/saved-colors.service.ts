import { Injectable, signal } from '@angular/core';
import { uid } from '../utils/id.utils';

export interface SavedColor {
  id: string;
  name: string;
  value: string;
}

const STORAGE_KEY = 'mailBuilder.savedColors';

function load(): SavedColor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// localStorage-backed for now; swap load()/persist() for HTTP calls to the backend
// once saved colors move to the database, keeping the public signal/methods the same.
@Injectable({ providedIn: 'root' })
export class SavedColorsService {
  private _colors = signal<SavedColor[]>(load());
  colors = this._colors.asReadonly();

  private persist(colors: SavedColor[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }

  add(name: string, value: string) {
    const color: SavedColor = { id: uid(), name, value };
    this._colors.update(colors => {
      const next = [...colors, color];
      this.persist(next);
      return next;
    });
  }

  remove(id: string) {
    this._colors.update(colors => {
      const next = colors.filter(c => c.id !== id);
      this.persist(next);
      return next;
    });
  }
}
