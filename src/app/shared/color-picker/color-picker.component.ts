import { Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { SavedColorsService } from '../../services/saved-colors.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [HlmButton],
  templateUrl: './color-picker.component.html',
})
export class ColorPickerComponent {
  private savedColorsService = inject(SavedColorsService);
  private workspace = inject(WorkspaceContextService);
  private host = inject(ElementRef<HTMLElement>);

  value = input<string>('#000000');
  valueChange = output<string>();

  // The active workspace palette (open email's effective colors, or the category
  // being edited) wins over the account-level saved colors.
  savedColors = computed(() => this.workspace.palette() ?? this.savedColorsService.colors());
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
