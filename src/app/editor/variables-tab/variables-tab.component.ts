import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorStore } from '../../store/editor.store';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-variables-tab',
  standalone: true,
  imports: [FormsModule, HlmInput, HlmButton],
  templateUrl: './variables-tab.component.html',
})
export class VariablesTabComponent {
  store = inject(EditorStore);
  variables = computed(() => this.store.doc().variables);

  newName = signal('');
  newDefaultValue = signal('');
  copiedId = signal<string | null>(null);

  add() {
    const name = this.newName().trim().replace(/\s+/g, '_');
    if (!name) return;
    this.store.addVariable(name, this.newDefaultValue());
    this.newName.set('');
    this.newDefaultValue.set('');
  }

  remove(id: string) {
    this.store.removeVariable(id);
  }

  updateDefaultValue(id: string, value: string) {
    this.store.updateVariable(id, { defaultValue: value });
  }

  copyToken(id: string, name: string) {
    navigator.clipboard.writeText(`{{${name}}}`);
    this.copiedId.set(id);
    setTimeout(() => this.copiedId.set(null), 1200);
  }
}
