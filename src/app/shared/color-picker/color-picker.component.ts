import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { SavedColorsService } from '../../services/saved-colors.service';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  templateUrl: './color-picker.component.html',
})
export class ColorPickerComponent {
  private savedColorsService = inject(SavedColorsService);
  private host = inject(ElementRef<HTMLElement>);

  value = input<string>('#000000');
  valueChange = output<string>();

  savedColors = this.savedColorsService.colors;
  open = signal(false);

  toggle() {
    this.open.update(o => !o);
  }

  pick(value: string) {
    this.valueChange.emit(value);
    this.open.set(false);
  }

  onCustomChange(value: string) {
    this.valueChange.emit(value);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
