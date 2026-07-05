import { Component, computed, inject } from '@angular/core';
import { UserSettingsService } from '../../services/user-settings.service';
import { HlmButton } from '@spartan-ng/helm/button';

// Explicit save control for account settings: shows the dirty/saving state and
// a Save button. Dropped into each Settings sub-tab that edits account data.
@Component({
  selector: 'app-settings-save-bar',
  standalone: true,
  imports: [HlmButton],
  template: `
    <div class="flex items-center justify-end gap-3">
      <span class="text-xs" [class]="statusClass()">{{ statusText() }}</span>
      <button hlmBtn size="sm" [disabled]="!settings.dirty() || settings.saveState() === 'saving'" (click)="settings.save()">
        Save settings
      </button>
    </div>
  `,
})
export class SettingsSaveBarComponent {
  settings = inject(UserSettingsService);

  statusText = computed(() => {
    switch (this.settings.saveState()) {
      case 'saving': return 'Saving…';
      case 'saved': return 'Saved ✓';
      case 'error': return 'Save failed';
      default: return this.settings.dirty() ? 'Unsaved changes' : 'All changes saved';
    }
  });

  statusClass = computed(() => {
    switch (this.settings.saveState()) {
      case 'saved': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return this.settings.dirty() ? 'text-amber-600' : 'text-gray-400';
    }
  });
}
