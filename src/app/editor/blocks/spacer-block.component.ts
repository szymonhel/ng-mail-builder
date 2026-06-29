import { Component, input } from '@angular/core';
import { SpacerProps } from '../../models/email-doc.model';

@Component({
  selector: 'app-spacer-block',
  standalone: true,
  template: `<div [style.height.px]="props().height" style="background:repeating-linear-gradient(45deg,#f0f0f0,#f0f0f0 2px,transparent 2px,transparent 8px)"></div>`
})
export class SpacerBlockComponent {
  props = input.required<SpacerProps>();
}
