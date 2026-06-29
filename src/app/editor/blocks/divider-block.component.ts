import { Component, input } from '@angular/core';
import { DividerProps } from '../../models/email-doc.model';

@Component({
  selector: 'app-divider-block',
  standalone: true,
  template: `
    <div [style.padding]="props().padding">
      <hr [style.borderTop]="props().borderWidth + 'px solid ' + props().borderColor"
          style="border:none;margin:0" />
    </div>
  `
})
export class DividerBlockComponent {
  props = input.required<DividerProps>();
}
