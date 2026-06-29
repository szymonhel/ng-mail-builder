import { Component, inject } from '@angular/core';
import { CdkDrag, CdkDropList, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { EditorStore } from '../../store/editor.store';
import { RowComponent } from './row/row.component';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CdkDrag, CdkDropList, RowComponent],
  templateUrl: './canvas.component.html'
})
export class CanvasComponent {
  store = inject(EditorStore);

  onRowDrop(event: CdkDragDrop<any[]>) {
    this.store.moveRow(event.previousIndex, event.currentIndex);
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
