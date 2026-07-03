import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'ngmb.openaiApiKey';

// Single source of truth for the user's OpenAI key so any feature that calls the AI
// routes (import, auto-translate, ...) can read/set it without prop-drilling it through
// component inputs. Never sent anywhere except per-request to our own server, which
// forwards it straight to OpenAI and never persists it.
@Injectable({ providedIn: 'root' })
export class AiApiKeyService {
  private _key = signal(localStorage.getItem(STORAGE_KEY) ?? '');
  key = this._key.asReadonly();

  set(value: string) {
    const trimmed = value.trim();
    this._key.set(trimmed);
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  clear() {
    this._key.set('');
    localStorage.removeItem(STORAGE_KEY);
  }
}
