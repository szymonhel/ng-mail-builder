import { Injectable, inject } from '@angular/core';
import { UserSettingsService } from './user-settings.service';

export type { SavedColor } from './user-settings.service';

// Thin facade over UserSettingsService so existing consumers keep their API;
// colors are persisted per user in Azure Table storage.
@Injectable({ providedIn: 'root' })
export class SavedColorsService {
  private settings = inject(UserSettingsService);

  colors = this.settings.savedColors.asReadonly();

  add(name: string, value: string) {
    this.settings.addColor(name, value);
  }

  remove(id: string) {
    this.settings.removeColor(id);
  }
}
