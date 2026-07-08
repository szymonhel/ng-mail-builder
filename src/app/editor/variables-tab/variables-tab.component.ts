import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorStore } from '../../store/editor.store';
import { EmailCollection } from '../../models/email-doc.model';
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
  collections = computed(() => this.store.doc().collections ?? []);

  newName = signal('');
  newDefaultValue = signal('');
  copiedId = signal<string | null>(null);

  newCollectionName = signal('');
  // per-collection draft for the "add field" input, keyed by collection id
  newFieldNames = signal<Record<string, string>>({});

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

  addCollection() {
    const name = this.newCollectionName().trim().replace(/\s+/g, '_');
    if (!name) return;
    this.store.addCollection(name);
    this.newCollectionName.set('');
  }

  removeCollection(id: string) {
    this.store.removeCollection(id);
  }

  setNewFieldName(collectionId: string, value: string) {
    this.newFieldNames.update(m => ({ ...m, [collectionId]: value }));
  }

  addField(c: EmailCollection) {
    const name = (this.newFieldNames()[c.id] ?? '').trim().replace(/\s+/g, '_');
    if (!name) return;
    this.store.addCollectionField(c.id, name);
    this.setNewFieldName(c.id, '');
  }

  removeField(c: EmailCollection, field: string) {
    this.store.removeCollectionField(c.id, field);
  }

  addItem(c: EmailCollection) {
    this.store.addCollectionItem(c.id);
  }

  removeItem(c: EmailCollection, index: number) {
    this.store.removeCollectionItem(c.id, index);
  }

  updateItemField(c: EmailCollection, index: number, field: string, value: string) {
    this.store.updateCollectionItemField(c.id, index, field, value);
  }

  copyItemToken(collectionId: string, collectionName: string, field: string) {
    navigator.clipboard.writeText(`{{${collectionName}.${field}}}`);
    this.copiedId.set(`${collectionId}:${field}`);
    setTimeout(() => this.copiedId.set(null), 1200);
  }
}
