import { Component, computed, inject, input, output } from '@angular/core';
import { EditorStore } from '../../store/editor.store';
import { RowRepeat } from '../../models/email-doc.model';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { HlmLabel } from '@spartan-ng/helm/label';

@Component({
  selector: 'app-repeat-editor',
  standalone: true,
  imports: [HlmInput, HlmCheckbox, HlmLabel],
  templateUrl: './repeat-editor.component.html',
})
export class RepeatEditorComponent {
  private store = inject(EditorStore);

  repeat = input<RowRepeat | null | undefined>(null);
  label = input('Repeat for each item of...');
  repeatChange = output<RowRepeat | null>();

  collections = computed(() => this.store.doc().collections ?? []);

  selectedCollection = computed(() => {
    const name = this.repeat()?.collectionName;
    return name ? this.collections().find(c => c.name === name) ?? null : null;
  });

  toggle(enabled: boolean) {
    if (!enabled) {
      this.repeatChange.emit(null);
      return;
    }
    const first = this.collections()[0];
    this.repeatChange.emit({ collectionName: first?.name ?? '' });
  }

  setCollectionName(collectionName: string) {
    if (!this.repeat()) return;
    this.repeatChange.emit({ collectionName });
  }
}
