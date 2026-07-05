import { Component, inject } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { EditorStore } from '../../store/editor.store';
import { FormsModule } from '@angular/forms';
import { Block, Row, Column, VisibilityCondition } from '../../models/email-doc.model';
import { uid } from '../../utils/id.utils';
import { ColorPickerComponent } from '../../shared/color-picker/color-picker.component';
import { VariablePickerComponent } from '../../shared/variable-picker/variable-picker.component';
import { ConditionEditorComponent } from '../../shared/condition-editor/condition-editor.component';
import { ImageUrlInputComponent } from '../../shared/image-url-input/image-url-input.component';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTextarea } from '@spartan-ng/helm/textarea';

@Component({
  selector: 'app-inspector',
  standalone: true,
  imports: [
    FormsModule,
    TitleCasePipe,
    ColorPickerComponent,
    VariablePickerComponent,
    ConditionEditorComponent,
    ImageUrlInputComponent,
    HlmInput,
    HlmCheckbox,
    HlmLabel,
    HlmButton,
    HlmTextarea,
  ],
  templateUrl: './inspector.component.html',
})
export class InspectorComponent {
  store = inject(EditorStore);

  get block(): Block | null {
    return this.store.selectedBlock();
  }

  get column(): { row: Row; col: Column } | null {
    if (this.block) return null;
    const colId = this.store.selectedColumnId();
    if (!colId) return null;
    for (const row of this.store.doc().rows) {
      const col = row.columns.find((c) => c.id === colId);
      if (col) return { row, col };
    }
    return null;
  }

  get row(): Row | null {
    if (this.block || this.store.selectedColumnId()) return null;
    const id = this.store.selectedRowId();
    if (!id) return null;
    return this.store.doc().rows.find((r) => r.id === id) ?? null;
  }

  update(props: any) {
    if (this.block) {
      this.store.updateBlockProps(this.block.id, props);
    }
  }

  // Splices the token in at the caret instead of appending, then restores focus/caret
  // afterwards since re-rendering the [value]-bound field on update() drops both.
  private spliceToken(el: HTMLInputElement | HTMLTextAreaElement, current: string, token: string) {
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + token + current.slice(end);
    return { next, caretPos: start + token.length };
  }

  private restoreCaret(el: HTMLInputElement | HTMLTextAreaElement, pos: number) {
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  insertVariable(el: HTMLInputElement | HTMLTextAreaElement, key: string, token: string) {
    if (!this.block) return;
    const current: string = (this.block.props as any)[key] ?? '';
    const { next, caretPos } = this.spliceToken(el, current, token);
    this.update({ [key]: next });
    this.restoreCaret(el, caretPos);
  }

  private insertVariableIntoTableCell(el: HTMLInputElement, rowIndex: number, cellIndex: number, token: string) {
    if (!this.block) return;
    const current: string = (this.block.props as any).rows[rowIndex].cells[cellIndex] ?? '';
    const { next, caretPos } = this.spliceToken(el, current, token);
    this.updateTableCell(rowIndex, cellIndex, next);
    this.restoreCaret(el, caretPos);
  }

  private insertVariableIntoAccordionItem(el: HTMLInputElement | HTMLTextAreaElement, index: number, field: 'title' | 'content', token: string) {
    if (!this.block) return;
    const current: string = (this.block.props as any).items[index][field] ?? '';
    const { next, caretPos } = this.spliceToken(el, current, token);
    this.updateAccordionItem(index, field, next);
    this.restoreCaret(el, caretPos);
  }

  // A single "+ Variable" button serves the whole table/accordion (rather than one per
  // field), so it needs to know which field was last focused; these track that, and fall
  // back to the first cell/item when nothing has been focused yet (e.g. picked right
  // after adding a row with the button, no click into a field first).
  private lastTableCellFocus: { el: HTMLInputElement; rowIndex: number; cellIndex: number } | null = null;
  private lastAccordionFieldFocus: { el: HTMLInputElement | HTMLTextAreaElement; index: number; field: 'title' | 'content' } | null = null;

  onTableCellFocus(el: HTMLInputElement, rowIndex: number, cellIndex: number) {
    this.lastTableCellFocus = { el, rowIndex, cellIndex };
  }

  onAccordionFieldFocus(el: HTMLInputElement | HTMLTextAreaElement, index: number, field: 'title' | 'content') {
    this.lastAccordionFieldFocus = { el, index, field };
  }

  insertVariableIntoTable(token: string) {
    if (!this.block) return;
    const rows = (this.block.props as any).rows as { cells: string[] }[];
    if (!rows.length || !rows[0].cells.length) return;
    const target = this.lastTableCellFocus;
    if (target) {
      this.insertVariableIntoTableCell(target.el, target.rowIndex, target.cellIndex, token);
    } else {
      this.updateTableCell(0, 0, (rows[0].cells[0] ?? '') + token);
    }
  }

  insertVariableIntoAccordion(token: string) {
    if (!this.block) return;
    const items = (this.block.props as any).items as { title: string; content: string }[];
    if (!items.length) return;
    const target = this.lastAccordionFieldFocus;
    if (target) {
      this.insertVariableIntoAccordionItem(target.el, target.index, target.field, token);
    } else {
      this.updateAccordionItem(0, 'title', (items[0].title ?? '') + token);
    }
  }

  updateColumnBg(color: string | null) {
    if (this.column) {
      this.store.updateColumnStyle(this.column.row.id, this.column.col.id, {
        backgroundColor: color,
      });
    }
  }

  updateRowBg(color: string | null) {
    if (this.row) {
      this.store.updateRowStyle(this.row.id, { backgroundColor: color });
    }
  }

  updateRowCondition(condition: VisibilityCondition | null) {
    if (this.row) {
      this.store.updateRowCondition(this.row.id, condition);
    }
  }

  updateBlockCondition(condition: VisibilityCondition | null) {
    if (this.block) {
      this.store.updateBlockCondition(this.block.id, condition);
    }
  }

  updateSocialLink(index: number, field: 'href' | 'iconUrl', value: string) {
    if (!this.block) return;
    const links = [...(this.block.props as any).links];
    links[index] = { ...links[index], [field]: value };
    this.store.updateBlockProps(this.block.id, { links });
  }

  get textProps() {
    return this.block?.props as any;
  }
  get imageProps() {
    return this.block?.props as any;
  }
  get buttonProps() {
    return this.block?.props as any;
  }
  get dividerProps() {
    return this.block?.props as any;
  }
  get spacerProps() {
    return this.block?.props as any;
  }

  updateAccordionItem(index: number, field: 'title' | 'content', value: string) {
    if (!this.block) return;
    const items = [...(this.block.props as any).items];
    items[index] = { ...items[index], [field]: value };
    this.store.updateBlockProps(this.block.id, { items });
  }

  addAccordionItem() {
    if (!this.block) return;
    const items = [
      ...(this.block.props as any).items,
      { id: uid(), title: 'New question', content: 'Answer here' },
    ];
    this.store.updateBlockProps(this.block.id, { items });
  }

  removeAccordionItem(index: number) {
    if (!this.block) return;
    const blockId = this.block.id;
    const removed = (this.block.props as any).items[index];
    const items = (this.block.props as any).items.filter((_: any, i: number) => i !== index);
    this.store.updateBlockProps(blockId, { items });
    if (removed?.id) this.store.pruneTranslationsForItem(blockId, removed.id);
  }

  updateNavbarLink(index: number, field: 'label' | 'href', value: string) {
    if (!this.block) return;
    const links = [...(this.block.props as any).links];
    links[index] = { ...links[index], [field]: value };
    this.store.updateBlockProps(this.block.id, { links });
  }

  addNavbarLink() {
    if (!this.block) return;
    const links = [...(this.block.props as any).links, { id: uid(), label: 'Link', href: '#' }];
    this.store.updateBlockProps(this.block.id, { links });
  }

  removeNavbarLink(index: number) {
    if (!this.block) return;
    const blockId = this.block.id;
    const removed = (this.block.props as any).links[index];
    const links = (this.block.props as any).links.filter((_: any, i: number) => i !== index);
    this.store.updateBlockProps(blockId, { links });
    if (removed?.id) this.store.pruneTranslationsForItem(blockId, removed.id);
  }

  updateTableCell(rowIndex: number, cellIndex: number, value: string) {
    if (!this.block) return;
    const rows = (this.block.props as any).rows.map((r: any, ri: number) =>
      ri !== rowIndex
        ? r
        : { ...r, cells: r.cells.map((c: string, ci: number) => (ci !== cellIndex ? c : value)) },
    );
    this.store.updateBlockProps(this.block.id, { rows });
  }

  addTableRow() {
    if (!this.block) return;
    const existing = (this.block.props as any).rows as any[];
    const numCols = existing[0]?.cells.length ?? 1;
    const rows = [...existing, { id: uid(), cells: Array(numCols).fill('') }];
    this.store.updateBlockProps(this.block.id, { rows });
  }

  removeTableRow(index: number) {
    if (!this.block) return;
    const blockId = this.block.id;
    const removed = (this.block.props as any).rows[index];
    const rows = (this.block.props as any).rows.filter((_: any, i: number) => i !== index);
    this.store.updateBlockProps(blockId, { rows });
    if (removed?.id) this.store.pruneTranslationsForItem(blockId, removed.id);
  }

  // Column add/remove shifts every subsequent cell's index within its row, and cells
  // have no id of their own (only the row does) — so cell-keyed translations can't be
  // reattached safely. Wipe this block's cell translations rather than risk silently
  // misattributing a translation to the wrong column.
  addTableColumn() {
    if (!this.block) return;
    const blockId = this.block.id;
    const rows = (this.block.props as any).rows.map((r: any) => ({ ...r, cells: [...r.cells, ''] }));
    this.store.updateBlockProps(blockId, { rows });
    this.store.pruneTranslationsForItem(blockId);
  }

  removeTableColumn(colIndex: number) {
    if (!this.block) return;
    const blockId = this.block.id;
    const rows = (this.block.props as any).rows.map((r: any) => ({
      ...r,
      cells: r.cells.filter((_: any, i: number) => i !== colIndex),
    }));
    this.store.updateBlockProps(blockId, { rows });
    this.store.pruneTranslationsForItem(blockId);
  }

  updateCarouselImage(index: number, field: 'src' | 'alt' | 'href', value: string) {
    if (!this.block) return;
    const images = [...(this.block.props as any).images];
    images[index] = { ...images[index], [field]: value };
    this.store.updateBlockProps(this.block.id, { images });
  }

  addCarouselImage() {
    if (!this.block) return;
    const images = [
      ...(this.block.props as any).images,
      { id: uid(), src: 'https://placehold.co/600x400', alt: 'Slide', href: '' },
    ];
    this.store.updateBlockProps(this.block.id, { images });
  }

  removeCarouselImage(index: number) {
    if (!this.block) return;
    const blockId = this.block.id;
    const removed = (this.block.props as any).images[index];
    const images = (this.block.props as any).images.filter((_: any, i: number) => i !== index);
    this.store.updateBlockProps(blockId, { images });
    if (removed?.id) this.store.pruneTranslationsForItem(blockId, removed.id);
  }
}
