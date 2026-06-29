import { Component, input } from '@angular/core';
import { ButtonProps } from '../../models/email-doc.model';

@Component({
  selector: 'app-button-block',
  standalone: true,
  template: `
    <div [style.textAlign]="props().align" [style.padding]="props().padding">
      <span [style.display]="'inline-block'"
            [style.background]="props().bg"
            [style.color]="props().color"
            [style.padding]="'12px 24px'"
            [style.borderRadius.px]="props().borderRadius"
            [style.fontWeight]="'bold'"
            [style.cursor]="'pointer'">
        {{ props().label }}
      </span>
    </div>
  `
})
export class ButtonBlockComponent {
  props = input.required<ButtonProps>();
}
