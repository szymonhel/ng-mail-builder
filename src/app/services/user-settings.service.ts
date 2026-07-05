import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { uid } from '../utils/id.utils';

export interface SavedColor {
  id: string;
  name: string;
  value: string;
}

export interface GlobalDataItem {
  id: string;
  name: string;
  value: string;
}

export interface ButtonDefaults {
  bg: string;
  color: string;
  borderRadius: number;
}

// Matches the built-in BLOCK_DEFAULTS for buttons, so a fresh account behaves
// exactly like before the setting existed.
export const BUILTIN_BUTTON_DEFAULTS: ButtonDefaults = { bg: '#1a73e8', color: '#ffffff', borderRadius: 3 };

interface UserSettings {
  savedColors: SavedColor[];
  globalData: GlobalDataItem[];
  openaiKey: string;
  buttonDefaults: ButtonDefaults;
}

// Legacy localStorage keys, migrated to the backend on first load.
const COLORS_STORAGE_KEY = 'mailBuilder.savedColors';
const AI_KEY_STORAGE_KEY = 'ngmb.openaiApiKey';

// Per-user settings persisted in Azure Table storage: saved colors, global
// data (account-wide variables usable in any email), and the OpenAI key.
// Loaded once at startup; mutations only mark the state dirty — persisting
// requires an explicit save() (the save bars in the Settings tab).
@Injectable({ providedIn: 'root' })
export class UserSettingsService {
  private http = inject(HttpClient);

  savedColors = signal<SavedColor[]>([]);
  globalData = signal<GlobalDataItem[]>([]);
  openaiKey = signal('');
  buttonDefaults = signal<ButtonDefaults>({ ...BUILTIN_BUTTON_DEFAULTS });

  loaded = signal(false);
  dirty = signal(false);
  saveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  error = signal<string | null>(null);

  // Name → value map for template variable substitution.
  globalValues = computed<Record<string, string>>(() =>
    Object.fromEntries(this.globalData().filter(d => d.name.trim()).map(d => [d.name.trim(), d.value]))
  );

  constructor() {
    // Unsaved settings would be lost on reload/close — warn like an editor would.
    window.addEventListener('beforeunload', e => {
      if (this.dirty()) e.preventDefault();
    });

    this.http.get<{ settings: Partial<UserSettings> | null }>(`${environment.apiUrl}/settings`).subscribe({
      next: res => {
        if (res.settings) {
          this.savedColors.set(res.settings.savedColors ?? []);
          this.globalData.set(res.settings.globalData ?? []);
          this.openaiKey.set(res.settings.openaiKey ?? '');
          this.buttonDefaults.set({ ...BUILTIN_BUTTON_DEFAULTS, ...res.settings.buttonDefaults });
          this.loaded.set(true);
        } else {
          this.migrateFromLocalStorage();
        }
      },
      error: err => {
        this.loaded.set(true);
        this.error.set(err?.error?.error ?? 'Failed to load settings.');
      },
    });
  }

  // First run for this user: seed the backend from whatever the old
  // localStorage-based services had, so nothing is lost.
  private migrateFromLocalStorage() {
    try {
      const rawColors = localStorage.getItem(COLORS_STORAGE_KEY);
      this.savedColors.set(rawColors ? JSON.parse(rawColors) : []);
    } catch {
      this.savedColors.set([]);
    }
    this.openaiKey.set(localStorage.getItem(AI_KEY_STORAGE_KEY) ?? '');
    this.loaded.set(true);
    if (this.savedColors().length > 0 || this.openaiKey()) {
      this.dirty.set(true);
      this.save();
    }
  }

  private markDirty() {
    this.dirty.set(true);
    this.saveState.set('idle');
  }

  save() {
    if (!this.dirty() || this.saveState() === 'saving') return;

    const settings: UserSettings = {
      savedColors: this.savedColors(),
      globalData: this.globalData(),
      openaiKey: this.openaiKey(),
      buttonDefaults: this.buttonDefaults(),
    };
    this.error.set(null);
    this.saveState.set('saving');
    this.http.put(`${environment.apiUrl}/settings`, { settings }).subscribe({
      next: () => {
        this.dirty.set(false);
        this.saveState.set('saved');
        setTimeout(() => {
          if (this.saveState() === 'saved') this.saveState.set('idle');
        }, 2000);
      },
      error: err => {
        this.saveState.set('error');
        this.error.set(err?.error?.error ?? 'Failed to save settings.');
      },
    });
  }

  addColor(name: string, value: string) {
    this.savedColors.update(colors => [...colors, { id: uid(), name, value }]);
    this.markDirty();
  }

  removeColor(id: string) {
    this.savedColors.update(colors => colors.filter(c => c.id !== id));
    this.markDirty();
  }

  setOpenaiKey(value: string) {
    this.openaiKey.set(value.trim());
    this.markDirty();
  }

  updateButtonDefaults(patch: Partial<ButtonDefaults>) {
    this.buttonDefaults.update(d => ({ ...d, ...patch }));
    this.markDirty();
  }

  addGlobalData() {
    this.globalData.update(items => [...items, { id: uid(), name: '', value: '' }]);
    this.markDirty();
  }

  updateGlobalData(id: string, patch: Partial<Pick<GlobalDataItem, 'name' | 'value'>>) {
    this.globalData.update(items => items.map(i => (i.id === id ? { ...i, ...patch } : i)));
    this.markDirty();
  }

  removeGlobalData(id: string) {
    this.globalData.update(items => items.filter(i => i.id !== id));
    this.markDirty();
  }
}
