import { Component, input, signal, computed } from '@angular/core';
import { CarouselProps } from '../../models/email-doc.model';

@Component({
  selector: 'app-carousel-block',
  standalone: true,
  template: `
    <div [style.padding]="props().padding" style="position:relative;user-select:none">
      <!-- Main image -->
      <div style="position:relative;overflow:hidden">
        @if (current().href) {
          <a [href]="current().href">
            <img [src]="current().src" [alt]="current().alt"
                 style="width:100%;display:block;border-radius:2px" />
          </a>
        } @else {
          <img [src]="current().src" [alt]="current().alt"
               style="width:100%;display:block;border-radius:2px" />
        }

        <!-- Prev / Next arrows -->
        @if (props().images.length > 1) {
          <button (click)="prev()"
                  style="position:absolute;left:8px;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;border:none;background:rgba(0,0,0,0.5);color:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;line-height:1">
            ‹
          </button>
          <button (click)="next()"
                  style="position:absolute;right:8px;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;border:none;background:rgba(0,0,0,0.5);color:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;line-height:1">
            ›
          </button>
        }
      </div>

      <!-- Dot indicators -->
      @if (props().images.length > 1) {
        <div style="display:flex;justify-content:center;gap:6px;padding:8px 0 4px">
          @for (img of props().images; track $index; let i = $index) {
            <span (click)="goTo(i)"
                  [style.background]="i === activeIndex() ? '#1a73e8' : '#ccc'"
                  style="width:8px;height:8px;border-radius:50%;cursor:pointer;display:inline-block;transition:background 0.2s">
            </span>
          }
        </div>
      }
    </div>
  `
})
export class CarouselBlockComponent {
  props = input.required<CarouselProps>();
  activeIndex = signal(0);
  current = computed(() => this.props().images[this.activeIndex()] ?? this.props().images[0]);

  prev() {
    this.activeIndex.update(i => (i - 1 + this.props().images.length) % this.props().images.length);
  }
  next() {
    this.activeIndex.update(i => (i + 1) % this.props().images.length);
  }
  goTo(i: number) { this.activeIndex.set(i); }
}
