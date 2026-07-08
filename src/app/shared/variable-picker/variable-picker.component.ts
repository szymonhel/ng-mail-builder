import { Component, ElementRef, HostListener, computed, inject, output, signal } from '@angular/core';
import { EditorStore } from '../../store/editor.store';
import { UserSettingsService } from '../../services/user-settings.service';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-variable-picker',
  standalone: true,
  imports: [HlmButton],
  templateUrl: './variable-picker.component.html',
})
export class VariablePickerComponent {
  private store = inject(EditorStore);
  private userSettings = inject(UserSettingsService);
  private host = inject(ElementRef<HTMLElement>);

  insert = output<string>();

  variables = computed(() => this.store.doc().variables);
  // Flattened {{collection.field}} tokens; only meaningful inside a repeated row,
  // but always offered since the picker doesn't know where its host field lives.
  collectionTokens = computed(() =>
    (this.store.doc().collections ?? []).flatMap(c => c.fields.map(f => `${c.name}.${f}`))
  );
  // Account-level global data names, excluding any shadowed by a doc variable.
  globalNames = computed(() => {
    const docNames = new Set(this.variables().map(v => v.name));
    return this.userSettings.globalData()
      .map(d => d.name.trim())
      .filter(name => name && !docNames.has(name));
  });
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
