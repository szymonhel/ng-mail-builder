import { Component, input } from '@angular/core';
import { HeroProps } from '../../models/email-doc.model';

@Component({
  selector: 'app-hero-block',
  standalone: true,
  template: `
    <div [style.position]="'relative'"
         [style.minHeight]="props().height"
         [style.background]="props().backgroundUrl ? 'url(' + props().backgroundUrl + ') center/cover no-repeat' : props().backgroundColor"
         [style.backgroundColor]="props().backgroundColor"
         [style.display]="'flex'"
         [style.flexDirection]="'column'"
         [style.alignItems]="'center'"
         [style.justifyContent]="props().verticalAlign === 'top' ? 'flex-start' : props().verticalAlign === 'bottom' ? 'flex-end' : 'center'"
         [style.padding]="props().padding"
         [style.boxSizing]="'border-box'">
      <!-- Dark overlay -->
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.35);pointer-events:none"></div>
      <!-- Content -->
      <div style="position:relative;text-align:center;width:100%">
        <div [style.color]="props().titleColor"
             [style.fontSize.px]="props().titleSize"
             [style.fontWeight]="'700'"
             [style.lineHeight]="'1.2'"
             [style.marginBottom]="'12px'">{{ props().title }}</div>
        @if (props().subtitle) {
          <div [style.color]="props().subtitleColor"
               [style.fontSize.px]="16"
               [style.marginBottom]="'20px'">{{ props().subtitle }}</div>
        }
        @if (props().buttonLabel) {
          <span [style.display]="'inline-block'"
                [style.background]="props().buttonBg"
                [style.color]="props().buttonColor"
                [style.padding]="'12px 28px'"
                [style.borderRadius.px]="4"
                [style.fontWeight]="'bold'"
                [style.fontSize.px]="15"
                [style.cursor]="'pointer'">
            {{ props().buttonLabel }}
          </span>
        }
      </div>
    </div>
  `
})
export class HeroBlockComponent {
  props = input.required<HeroProps>();
}
