import { Component, ElementRef, HostListener, computed, inject, output, signal } from '@angular/core';
import { EditorStore } from '../../store/editor.store';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-variable-picker',
  standalone: true,
  imports: [HlmButton],
  templateUrl: './variable-picker.component.html',
})
export class VariablePickerComponent {
  private store = inject(EditorStore);
  private host = inject(ElementRef<HTMLElement>);

  insert = output<string>();

  variables = computed(() => this.store.doc().variables);
  open = signal(false);

  toggle() {
    this.open.update(o => !o);
  }

  pick(name: string) {
    this.insert.emit(`{{${name}}}`);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
