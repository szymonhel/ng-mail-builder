import { Component, inject, input, OnInit, OnDestroy, computed } from '@angular/core';
import { CdkDrag, CdkDropList, CdkDragDrop, CdkDragPlaceholder, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { EditorStore } from '../../../store/editor.store';
import { DropListsService, PALETTE_LIST_ID } from '../../drop-lists.service';
import { Row, Column, Block } from '../../../models/email-doc.model';
import { BlockHostComponent } from '../../block-host/block-host.component';
import { PaletteItem } from '../../palette/palette.component';

@Component({
  selector: 'app-column',
  standalone: true,
  imports: [CdkDrag, CdkDropList, CdkDragPlaceholder, BlockHostComponent],
  template: `
    <div cdkDropList
         [id]="listId"
         [cdkDropListData]="col().blocks"
         [cdkDropListConnectedTo]="connectedTo()"
         (cdkDropListDropped)="onBlockDrop($any($event))"
         class="min-h-[48px] p-1 h-full">
      @for (block of col().blocks; track block.id) {
        <div cdkDrag
             class="group relative border-2 rounded-sm my-1 transition-all bg-white cursor-pointer"
             [class.border-blue-500]="isSelected(block.id)"
             [class.bg-blue-50]="isSelected(block.id)"
             [class.border-transparent]="!isSelected(block.id)"
             (click)="selectBlock(block.id, $event)">
          <div class="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab text-gray-300 text-sm z-10 select-none hover:text-gray-500" cdkDragHandle>&#x22EE;&#x22EE;</div>
          @if (block.condition) {
            <span class="absolute left-6 top-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold z-10" title="Only rendered when its condition is met">conditional</span>
          }
          <div class="px-7">
            <app-block-host [block]="block" />
          </div>
          <div class="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
               [class.opacity-100]="isSelected(block.id)">
            <button class="border-0 bg-transparent cursor-pointer px-1.5 py-0.5 rounded-sm text-xs text-red-500 hover:bg-red-50" (click)="removeBlock(block.id, $event)" title="Remove block">&#x2715;</button>
          </div>
          <div *cdkDragPlaceholder class="h-10 bg-blue-100 border-2 border-dashed border-blue-500 rounded-sm"></div>
        </div>
      }
      @if (col().blocks.length === 0) {
        <div class="flex items-center justify-center h-16 border-2 border-dashed border-gray-200 rounded-sm text-gray-400 text-xs">
          Drop here
        </div>
      }
    </div>
  `
})
export class ColumnComponent implements OnInit, OnDestroy {
  row = input.required<Row>();
  col = input.required<Column>();

  store = inject(EditorStore);
  dropListsService = inject(DropListsService);

  get listId() { return 'col-' + this.col().id; }

  connectedTo = computed(() => [
    PALETTE_LIST_ID,
    ...this.dropListsService.columnIds().filter(id => id !== this.listId)
  ]);

  ngOnInit() { this.dropListsService.register(this.listId); }
  ngOnDestroy() { this.dropListsService.unregister(this.listId); }

  onBlockDrop(event: CdkDragDrop<Block[] | PaletteItem[]>) {
    if (event.previousContainer.id === PALETTE_LIST_ID) {
      const paletteItem = event.item.data as PaletteItem;
      this.store.addBlockAt(this.row().id, this.col().id, paletteItem.type, event.currentIndex);
    } else if (event.previousContainer === event.container) {
      const blocks = [...this.col().blocks];
      moveItemInArray(blocks, event.previousIndex, event.currentIndex);
      this.store.setBlocksInColumn(this.row().id, this.col().id, blocks);
    } else {
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
      const targetBlocks = [...this.col().blocks];
      transferArrayItem(sourceBlocks, targetBlocks, event.previousIndex, event.currentIndex);
      this.store.moveBlockAcrossColumns(sourceRowId, sourceColId, sourceBlocks, this.row().id, this.col().id, targetBlocks);
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

  isSelected(blockId: string) {
    return this.store.selectedBlockId() === blockId;
  }
}
