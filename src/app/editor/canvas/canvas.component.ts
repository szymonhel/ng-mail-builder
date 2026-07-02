import { Component, inject } from '@angular/core';
import { CdkDrag, CdkDropList, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { EditorStore } from '../../store/editor.store';
import { RowComponent } from './row/row.component';
import { SECTIONS_LIST_ID, CANVAS_ROWS_LIST_ID } from '../drop-lists.service';
import { SectionPreset } from '../presets/section-presets';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CdkDrag, CdkDropList, RowComponent],
  templateUrl: './canvas.component.html'
})
export class CanvasComponent {
  store = inject(EditorStore);

  readonly canvasRowsListId = CANVAS_ROWS_LIST_ID;

  onRowDrop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer.id === SECTIONS_LIST_ID) {
      const preset = event.item.data as SectionPreset;
      this.store.insertPresetRowAt(event.currentIndex, preset.build());
    } else if (event.previousContainer === event.container) {
      this.store.moveRow(event.previousIndex, event.currentIndex);
    }
  }

  addRow() {
    this.store.addRow();
  }

  clearSelection(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.store.selectBlock(null);
      this.store.selectRow(null);
    }
  }
}
