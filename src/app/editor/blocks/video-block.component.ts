import { Component, input } from '@angular/core';
import { VideoProps } from '../../models/email-doc.model';

@Component({
  selector: 'app-video-block',
  standalone: true,
  template: `
    <div [style.padding]="props().padding">
      <div [style.textAlign]="props().align">
        <a [href]="props().videoUrl" style="position:relative;display:inline-block;max-width:100%">
          <img [src]="props().thumbnailUrl" [alt]="props().alt"
               [style.maxWidth.px]="props().width"
               style="width:100%;display:block;border-radius:4px" />
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:56px;height:56px;background:rgba(0,0,0,0.65);border-radius:50%;display:flex;align-items:center;justify-content:center;pointer-events:none">
            <div style="width:0;height:0;border-top:10px solid transparent;border-bottom:10px solid transparent;border-left:18px solid white;margin-left:4px"></div>
          </div>
        </a>
      </div>
    </div>
  `
})
export class VideoBlockComponent {
  props = input.required<VideoProps>();
}
