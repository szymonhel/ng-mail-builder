import { Component, input } from '@angular/core';

// Small loading indicator used wherever data is being fetched: an animated ring
// with an optional label. `center` adds the padded, centered layout the full-page
// loading states share.
@Component({
  selector: 'app-spinner',
  standalone: true,
  template: `
    <div class="flex items-center gap-2 text-gray-400"
         [class.justify-center]="center()"
         [class.py-16]="center()">
      <span class="inline-block rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin shrink-0"
            [style.width.px]="size()" [style.height.px]="size()"></span>
      @if (label()) {
        <span class="text-sm">{{ label() }}</span>
      }
    </div>
  `,
})
export class SpinnerComponent {
  label = input('');
  size = input(18);
  center = input(false);
}
