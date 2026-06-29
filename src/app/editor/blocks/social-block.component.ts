import { Component, input } from '@angular/core';
import { SocialProps, SocialPlatform } from '../../models/email-doc.model';

const PLATFORM_CONFIG: Record<SocialPlatform, { color: string; label: string }> = {
  facebook:  { color: '#1877F2', label: 'f'  },
  instagram: { color: '#E4405F', label: 'ig' },
  twitter:   { color: '#000000', label: 'X'  },
  linkedin:  { color: '#0A66C2', label: 'in' },
  youtube:   { color: '#FF0000', label: '▶'  },
  tiktok:    { color: '#010101', label: 'TT' },
  pinterest: { color: '#E60023', label: 'P'  },
  github:    { color: '#24292E', label: 'GH' },
  discord:   { color: '#5865F2', label: 'DC' },
  reddit:    { color: '#FF4500', label: 'r/' },
  whatsapp:  { color: '#25D366', label: 'WA' },
  telegram:  { color: '#2CA5E0', label: 'TG' },
};

@Component({
  selector: 'app-social-block',
  standalone: true,
  template: `
    <div [style.textAlign]="props().align" [style.padding]="props().padding">
      @for (link of props().links; track link.platform) { @if (link.href) {
        <a [href]="link.href"
           [style.display]="'inline-flex'"
           [style.alignItems]="'center'"
           [style.justifyContent]="'center'"
           [style.width.px]="props().iconSize"
           [style.height.px]="props().iconSize"
           [style.borderRadius.px]="props().iconSize / 2"
           [style.background]="config(link.platform).color"
           [style.color]="'#fff'"
           [style.fontSize.px]="props().iconSize * 0.38"
           [style.fontWeight]="'bold'"
           [style.textDecoration]="'none'"
           [style.margin]="'0 4px'"
           [style.fontFamily]="'Arial, sans-serif'">
          {{ config(link.platform).label }}
        </a>
      } }
    </div>
  `
})
export class SocialBlockComponent {
  props = input.required<SocialProps>();
  config(platform: SocialPlatform) { return PLATFORM_CONFIG[platform]; }
}
