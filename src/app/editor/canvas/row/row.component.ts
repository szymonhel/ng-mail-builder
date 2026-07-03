import { Component, inject, input } from '@angular/core';
import { EditorStore } from '../../../store/editor.store';
import { Row } from '../../../models/email-doc.model';
import { ColumnComponent } from '../column/column.component';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-row',
  standalone: true,
  imports: [ColumnComponent, HlmButton],
  templateUrl: './row.component.html'
})
export class RowComponent {
  row = input.required<Row>();
  store = inject(EditorStore);

  addColumn(event: MouseEvent) {
    event.stopPropagation();
    this.store.addColumn(this.row().id);
  }

  removeColumn(colId: string, event: MouseEvent) {
    event.stopPropagation();
    this.store.removeColumn(this.row().id, colId);
  }

  removeRow(event: MouseEvent) {
    event.stopPropagation();
    this.store.removeRow(this.row().id);
  }

  selectRow(event: MouseEvent) {
    event.stopPropagation();
    this.store.selectRow(this.row().id);
    this.store.selectBlock(null);
  }

  selectColumn(colId: string, event: MouseEvent) {
    event.stopPropagation();
    this.store.selectColumn(this.row().id, colId);
  }

  isRowSelected() {
    return this.store.selectedRowId() === this.row().id && !this.store.selectedBlockId() && !this.store.selectedColumnId();
  }

  isColumnSelected(colId: string) {
    return this.store.selectedColumnId() === colId && !this.store.selectedBlockId();
  }
}
