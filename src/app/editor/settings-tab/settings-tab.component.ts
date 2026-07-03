import { Component, inject } from '@angular/core';
import { EditorStore } from '../../store/editor.store';
import { ColorPickerComponent } from '../../shared/color-picker/color-picker.component';
import { ColorsTabComponent } from '../colors-tab/colors-tab.component';
import { VariablesTabComponent } from '../variables-tab/variables-tab.component';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTabs, HlmTabsList, HlmTabsTrigger, HlmTabsContent } from '@spartan-ng/helm/tabs';

@Component({
  selector: 'app-settings-tab',
  standalone: true,
  imports: [ColorPickerComponent, ColorsTabComponent, VariablesTabComponent, HlmInput, HlmTabs, HlmTabsList, HlmTabsTrigger, HlmTabsContent],
  templateUrl: './settings-tab.component.html',
})
export class SettingsTabComponent {
  store = inject(EditorStore);
}
