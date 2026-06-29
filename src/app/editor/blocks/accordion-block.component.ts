import { Component, input, signal } from '@angular/core';
import { AccordionProps } from '../../models/email-doc.model';

@Component({
  selector: 'app-accordion-block',
  standalone: true,
  template: `
    <div [style.padding]="props().padding">
      @for (item of props().items; track $index; let i = $index) {
        <div [style.border]="'1px solid ' + props().borderColor"
             [style.borderBottom]="$last ? '1px solid ' + props().borderColor : 'none'">
          <div [style.background]="props().titleBg"
               [style.color]="props().titleColor"
               [style.padding]="'10px 16px'"
               [style.cursor]="'pointer'"
               [style.fontWeight]="'600'"
               [style.display]="'flex'"
               [style.justifyContent]="'space-between'"
               [style.alignItems]="'center'"
               (click)="toggle(i)">
            <span>{{ item.title }}</span>
            <span [style.transform]="openIndex() === i ? 'rotate(180deg)' : 'none'"
                  [style.transition]="'transform 0.2s'"
                  [style.fontSize]="'12px'">▼</span>
          </div>
          @if (openIndex() === i) {
            <div [style.padding]="'10px 16px'"
                 [style.fontSize.px]="14"
                 [style.color]="'#555'">{{ item.content }}</div>
          }
        </div>
      }
    </div>
  `
})
export class AccordionBlockComponent {
  props = input.required<AccordionProps>();
  openIndex = signal<number | null>(0);
  toggle(i: number) { this.openIndex.update(v => v === i ? null : i); }
}
