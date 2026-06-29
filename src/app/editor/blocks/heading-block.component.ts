import { Component, input } from '@angular/core';
import { HeadingProps } from '../../models/email-doc.model';

@Component({
  selector: 'app-heading-block',
  standalone: true,
  template: `
    @switch (props().level) {
      @case (1) {
        <h1 [style.textAlign]="props().align" [style.color]="props().color" [style.padding]="props().padding" style="margin:0;font-size:28px;font-weight:700;line-height:1.2">{{ props().text }}</h1>
      }
      @case (2) {
        <h2 [style.textAlign]="props().align" [style.color]="props().color" [style.padding]="props().padding" style="margin:0;font-size:22px;font-weight:700;line-height:1.2">{{ props().text }}</h2>
      }
      @case (3) {
        <h3 [style.textAlign]="props().align" [style.color]="props().color" [style.padding]="props().padding" style="margin:0;font-size:18px;font-weight:600;line-height:1.2">{{ props().text }}</h3>
      }
    }
  `
})
export class HeadingBlockComponent {
  props = input.required<HeadingProps>();
}
