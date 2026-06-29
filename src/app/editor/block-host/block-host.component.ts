import { Component, input } from '@angular/core';
import { Block } from '../../models/email-doc.model';
import { TextBlockComponent } from '../blocks/text-block.component';
import { ImageBlockComponent } from '../blocks/image-block.component';
import { ButtonBlockComponent } from '../blocks/button-block.component';
import { DividerBlockComponent } from '../blocks/divider-block.component';
import { SpacerBlockComponent } from '../blocks/spacer-block.component';
import { HeadingBlockComponent } from '../blocks/heading-block.component';
import { SocialBlockComponent } from '../blocks/social-block.component';
import { VideoBlockComponent } from '../blocks/video-block.component';
import { HtmlBlockComponent } from '../blocks/html-block.component';
import { HeroBlockComponent } from '../blocks/hero-block.component';
import { TableBlockComponent } from '../blocks/table-block.component';
import { AccordionBlockComponent } from '../blocks/accordion-block.component';
import { NavbarBlockComponent } from '../blocks/navbar-block.component';
import { CarouselBlockComponent } from '../blocks/carousel-block.component';

@Component({
  selector: 'app-block-host',
  standalone: true,
  imports: [TextBlockComponent, ImageBlockComponent, ButtonBlockComponent, DividerBlockComponent, SpacerBlockComponent, HeadingBlockComponent, SocialBlockComponent, VideoBlockComponent, HtmlBlockComponent, HeroBlockComponent, TableBlockComponent, AccordionBlockComponent, NavbarBlockComponent, CarouselBlockComponent],
  template: `
    @switch (block().type) {
      @case ('text') { <app-text-block [props]="$any(block().props)" /> }
      @case ('image') { <app-image-block [props]="$any(block().props)" /> }
      @case ('button') { <app-button-block [props]="$any(block().props)" /> }
      @case ('divider') { <app-divider-block [props]="$any(block().props)" /> }
      @case ('spacer') { <app-spacer-block [props]="$any(block().props)" /> }
      @case ('heading') { <app-heading-block [props]="$any(block().props)" /> }
      @case ('social')  { <app-social-block  [props]="$any(block().props)" /> }
      @case ('video')   { <app-video-block   [props]="$any(block().props)" /> }
      @case ('html')    { <app-html-block    [props]="$any(block().props)" /> }
      @case ('hero')      { <app-hero-block      [props]="$any(block().props)" /> }
      @case ('table')     { <app-table-block     [props]="$any(block().props)" /> }
      @case ('accordion') { <app-accordion-block [props]="$any(block().props)" /> }
      @case ('navbar')    { <app-navbar-block    [props]="$any(block().props)" /> }
      @case ('carousel')  { <app-carousel-block  [props]="$any(block().props)" /> }
    }
  `
})
export class BlockHostComponent {
  block = input.required<Block>();
}
