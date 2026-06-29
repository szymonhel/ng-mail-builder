import { Component, input } from '@angular/core';
import { TextProps } from '../../models/email-doc.model';

@Component({
  selector: 'app-text-block',
  standalone: true,
  template: `
    <div [style.textAlign]="props().align"
         [style.fontSize.px]="props().fontSize"
         [style.color]="props().color"
         [style.padding]="props().padding"
         [innerHTML]="props().html">
    </div>
  `
})
export class TextBlockComponent {
  props = input.required<TextProps>();
}
