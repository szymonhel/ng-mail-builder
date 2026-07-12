import { Component, inject } from '@angular/core';
import { EditorStore } from '../../store/editor.store';
import { UserSettingsService } from '../../services/user-settings.service';
import { ColorPickerComponent } from '../../shared/color-picker/color-picker.component';
import { SettingsFormComponent } from '../../shared/settings-form/settings-form.component';
import { ColorPaletteEditorComponent } from '../../shared/color-palette-editor/color-palette-editor.component';
import { SettingsSaveBarComponent } from '../../shared/settings-save-bar/settings-save-bar.component';
import { ColorsTabComponent } from '../colors-tab/colors-tab.component';
import { VariablesTabComponent } from '../variables-tab/variables-tab.component';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTabs, HlmTabsList, HlmTabsTrigger, HlmTabsContent } from '@spartan-ng/helm/tabs';

@Component({
  selector: 'app-settings-tab',
  standalone: true,
  imports: [ColorPickerComponent, SettingsFormComponent, ColorPaletteEditorComponent, SettingsSaveBarComponent, ColorsTabComponent, VariablesTabComponent, HlmInput, HlmButton, HlmTabs, HlmTabsList, HlmTabsTrigger, HlmTabsContent],
  templateUrl: './settings-tab.component.html',
})
export class SettingsTabComponent {
  store = inject(EditorStore);
  userSettings = inject(UserSettingsService);

  // The inherited settings form is display-only (pointer-events disabled in the
  // template), so edits can't happen; the handler exists to satisfy the binding.
  onInheritedSettingsEdit() {}
}
