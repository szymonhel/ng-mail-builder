import { Component, input } from '@angular/core';
import { HtmlProps } from '../../models/email-doc.model';

@Component({
  selector: 'app-html-block',
  standalone: true,
  template: `
    <div [style.padding]="props().padding" [innerHTML]="props().html"></div>
  `
})
export class HtmlBlockComponent {
  props = input.required<HtmlProps>();
}
