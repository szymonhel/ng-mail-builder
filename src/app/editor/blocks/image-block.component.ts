import { Component, input } from '@angular/core';
import { ImageProps } from '../../models/email-doc.model';

@Component({
  selector: 'app-image-block',
  standalone: true,
  template: `
    <div [style.padding]="props().padding">
      <img [src]="props().src" [alt]="props().alt"
           [style.maxWidth.px]="props().width"
           [style.display]="'block'"
           [style.margin]="props().align === 'center' ? '0 auto' : props().align === 'right' ? '0 0 0 auto' : '0'"
           style="width:100%" />
    </div>
  `
})
export class ImageBlockComponent {
  props = input.required<ImageProps>();
}
