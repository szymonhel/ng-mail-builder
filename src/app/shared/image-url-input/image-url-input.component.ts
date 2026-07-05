import { Component, input, output, signal } from '@angular/core';
import { Asset } from '../../services/assets.service';
import { AssetPickerDialogComponent } from '../asset-picker-dialog/asset-picker-dialog.component';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmButton } from '@spartan-ng/helm/button';

// URL text input paired with an asset-library button: the modal lets the user
// pick an existing upload or upload a new image, and the chosen asset's public
// URL is emitted as if it had been typed.
@Component({
  selector: 'app-image-url-input',
  standalone: true,
  imports: [HlmInput, HlmButton, AssetPickerDialogComponent],
  template: `
    <div class="flex gap-1">
      <input hlmInput type="text" class="flex-1 min-w-0"
             [value]="value()" [placeholder]="placeholder()"
             (change)="valueChange.emit($any($event.target).value)" />
      <button hlmBtn variant="outline" size="sm" type="button" class="shrink-0 px-2"
              (click)="pickerOpen.set(true)" title="Choose from assets or upload">🖼</button>
    </div>
    @if (pickerOpen()) {
      <app-asset-picker-dialog (closed)="pickerOpen.set(false)" (selected)="onSelected($event)" />
    }
  `,
})
export class ImageUrlInputComponent {
  value = input('');
  placeholder = input('https://...');
  valueChange = output<string>();

  pickerOpen = signal(false);

  onSelected(asset: Asset) {
    this.pickerOpen.set(false);
    this.valueChange.emit(asset.url);
  }
}
