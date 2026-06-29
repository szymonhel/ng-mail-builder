import { Component, inject, input, OnInit, OnDestroy, computed } from '@angular/core';
import { CdkDrag, CdkDropList, CdkDragDrop, CdkDragPlaceholder, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { EditorStore } from '../../../store/editor.store';
import { DropListsService, PALETTE_LIST_ID } from '../../drop-lists.service';
import { Row, Block, BlockType } from '../../../models/email-doc.model';
import { BlockHostComponent } from '../../block-host/block-host.component';
import { PaletteItem } from '../../palette/palette.component';

@Component({
  selector: 'app-row',
  standalone: true,
  imports: [CdkDrag, CdkDropList, CdkDragPlaceholder, BlockHostComponent],
  templateUrl: './row.component.html'
})
export class RowComponent implements OnInit, OnDestroy {
  row = input.required<Row>();
  store = inject(EditorStore);
  dropListsService = inject(DropListsService);

  get column() { return this.row().columns[0]; }

  // Connect this column to all other columns so blocks can move between rows
  connectedTo = computed(() => [
    PALETTE_LIST_ID,
    ...this.dropListsService.columnIds().filter(id => id !== 'col-' + this.column.id)
  ]);

  get columnListId() { return 'col-' + this.column.id; }

  ngOnInit() {
    this.dropListsService.register(this.columnListId);
  }

  ngOnDestroy() {
    this.dropListsService.unregister(this.columnListId);
  }

  onBlockDrop(event: CdkDragDrop<Block[] | PaletteItem[]>) {
    if (event.previousContainer.id === PALETTE_LIST_ID) {
      // Dragged from palette → create a new block at the drop position
      const paletteItem = event.item.data as PaletteItem;
      this.store.addBlockAt(this.row().id, this.column.id, paletteItem.type, event.currentIndex);
    } else if (event.previousContainer === event.container) {
      // Reorder within the same column
      const blocks = [...this.column.blocks];
      moveItemInArray(blocks, event.previousIndex, event.currentIndex);
      this.store.setBlocksInColumn(this.row().id, this.column.id, blocks);
    } else {
      // Move from another row's column
      const sourceColId = event.previousContainer.id.replace('col-', '');
      let sourceRowId: string | null = null;
      for (const row of this.store.doc().rows) {
        if (row.columns.some(c => c.id === sourceColId)) {
          sourceRowId = row.id;
          break;
        }
      }
      if (!sourceRowId) return;

      const sourceBlocks = [...(event.previousContainer.data as Block[])];
      const targetBlocks = [...this.column.blocks];
      transferArrayItem(sourceBlocks, targetBlocks, event.previousIndex, event.currentIndex);
      this.store.setBlocksInColumn(sourceRowId, sourceColId, sourceBlocks);
      this.store.setBlocksInColumn(this.row().id, this.column.id, targetBlocks);
    }
  }

  selectBlock(id: string, event: MouseEvent) {
    event.stopPropagation();
    this.store.selectBlock(id);
    this.store.selectRow(this.row().id);
  }

  removeBlock(blockId: string, event: MouseEvent) {
    event.stopPropagation();
    this.store.removeBlock(blockId);
  }

  removeRow(event: MouseEvent) {
    event.stopPropagation();
    this.store.removeRow(this.row().id);
  }

  isSelected(blockId: string) {
    return this.store.selectedBlockId() === blockId;
  }

  isRowSelected() {
    return this.store.selectedRowId() === this.row().id && !this.store.selectedBlockId();
  }

  selectRow(event: MouseEvent) {
    event.stopPropagation();
    this.store.selectRow(this.row().id);
    this.store.selectBlock(null);
  }
}
