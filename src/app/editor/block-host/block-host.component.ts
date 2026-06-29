import { Component, input } from '@angular/core';
import { Block } from '../../models/email-doc.model';
import { TextBlockComponent } from '../blocks/text-block.component';
import { ImageBlockComponent } from '../blocks/image-block.component';
import { ButtonBlockComponent } from '../blocks/button-block.component';
import { DividerBlockComponent } from '../blocks/divider-block.component';
import { SpacerBlockComponent } from '../blocks/spacer-block.component';

@Component({
  selector: 'app-block-host',
  standalone: true,
  imports: [TextBlockComponent, ImageBlockComponent, ButtonBlockComponent, DividerBlockComponent, SpacerBlockComponent],
  template: `
    @switch (block().type) {
      @case ('text') { <app-text-block [props]="$any(block().props)" /> }
      @case ('image') { <app-image-block [props]="$any(block().props)" /> }
      @case ('button') { <app-button-block [props]="$any(block().props)" /> }
      @case ('divider') { <app-divider-block [props]="$any(block().props)" /> }
      @case ('spacer') { <app-spacer-block [props]="$any(block().props)" /> }
    }
  `
})
export class BlockHostComponent {
  block = input.required<Block>();
}
