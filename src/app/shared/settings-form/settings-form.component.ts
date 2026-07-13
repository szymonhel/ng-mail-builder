import { Component, input, output } from '@angular/core';
import { DocSettings } from '../../models/email-doc.model';
import { ColorPickerComponent } from '../color-picker/color-picker.component';
import { HlmInput } from '@spartan-ng/helm/input';

// Dumb form for the global document settings (layout, colors, border, typography,
// preview text). Emits partial patches; used both by the editor's Settings tab
// (bound to the doc) and the category settings page (bound to category defaults).
@Component({
  selector: 'app-settings-form',
  standalone: true,
  imports: [ColorPickerComponent, HlmInput],
  templateUrl: './settings-form.component.html',
})
export class SettingsFormComponent {
  settings = input.required<DocSettings>();
  settingsChange = output<Partial<DocSettings>>();

  update(patch: Partial<DocSettings>) {
    this.settingsChange.emit(patch);
  }
}
