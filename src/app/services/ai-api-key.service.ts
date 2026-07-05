import { Injectable, inject } from '@angular/core';
import { UserSettingsService } from './user-settings.service';

// Single source of truth for the user's OpenAI key so any feature that calls the AI
// routes (import, auto-translate, ...) can read/set it without prop-drilling it through
// component inputs. Persisted per user in the settings table; forwarded per-request
// to our own server, which passes it straight to OpenAI.
@Injectable({ providedIn: 'root' })
export class AiApiKeyService {
  private settings = inject(UserSettingsService);

  key = this.settings.openaiKey.asReadonly();

  set(value: string) {
    this.settings.setOpenaiKey(value);
  }

  clear() {
    this.settings.setOpenaiKey('');
  }
}
