import { Component, input } from '@angular/core';
import { NavbarProps } from '../../models/email-doc.model';

@Component({
  selector: 'app-navbar-block',
  standalone: true,
  template: `
    <div [style.background]="props().backgroundColor"
         [style.padding]="props().padding"
         [style.textAlign]="props().align">
      @for (link of props().links; track $index) {
        <a [href]="link.href"
           [style.color]="props().color"
           [style.fontSize.px]="props().fontSize"
           [style.textDecoration]="'none'"
           [style.fontWeight]="'500'"
           [style.padding]="'0 12px'"
           [style.display]="'inline-block'">
          {{ link.label }}
        </a>
      }
    </div>
  `
})
export class NavbarBlockComponent {
  props = input.required<NavbarProps>();
}
